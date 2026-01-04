const { getFirestore } = require("firebase-admin/firestore");
const admin = require("firebase-admin");
const functions = require("firebase-functions");
const path = require('path');
const { normalizeIssuerName } = require("../utils/normalization");
const { issuers: staticIssuers } = require('../data/issuers');
const { downloadAndStore } = require('../tasks/scrapeAndStore');

const db = getFirestore();

const {
    WHITELIST,
    ALIASES,
    ISSUER_METADATA
} = require("../utils/issuerConfig");

// Helper para obtener el ID base/canónico
const getBaseId = (name) => {
    let normalized = normalizeIssuerName(name);
    return ALIASES[normalized] || normalized;
};

exports.getAllIssuers = async (req, res) => {
    try {
        // 1. Fetch system config from Firestore (optional override)
        const configDoc = await db.collection("system_config").doc("issuers").get();
        const firestoreConfig = configDoc.exists ? configDoc.data() : null;

        const whitelist = firestoreConfig?.whitelist || WHITELIST;
        const aliasesSet = firestoreConfig?.aliases || ALIASES;
        const metadataMap = firestoreConfig?.metadata || ISSUER_METADATA;

        // 2. Fetch raw issuers from the main collection
        const issuersSnapshot = await db.collection("issuers").get();

        // 3. Transform and filter (Consolidation Logic)
        const consolidatedMap = new Map();

        issuersSnapshot.docs.forEach(doc => {
            const issuer = doc.data();
            const normalizedName = normalizeIssuerName(issuer.name || doc.id);
            const baseId = aliasesSet[normalizedName] || normalizedName;

            if (!whitelist.includes(baseId)) return;

            if (!consolidatedMap.has(baseId)) {
                const metadata = metadataMap[baseId];
                consolidatedMap.set(baseId, {
                    ...issuer,
                    id: baseId,
                    name: metadata?.name || issuer.name,
                    acronym: metadata?.acronym || issuer.acronym || "",
                    sector: metadata?.sector || issuer.sector || "Privado",
                    isActive: true,
                    documents: (issuer.documents || []).map(d => ({
                        ...d,
                        title: d.title || 'Documento sin título',
                        url: d.url || '#',
                        date: d.date || '',
                        type: d.type || 'UNKNOWN'
                    }))
                });
            } else {
                const existing = consolidatedMap.get(baseId);

                // Merge documents
                const existingUrls = new Set(existing.documents.map(d => d.url));
                if (issuer.documents) {
                    issuer.documents.forEach(d => {
                        if (!existingUrls.has(d.url)) {
                            existing.documents.push({
                                ...d,
                                title: d.title || 'Documento sin título',
                                url: d.url || '#',
                                date: d.date || '',
                                type: d.type || 'UNKNOWN'
                            });
                            existingUrls.add(d.url);
                        }
                    });
                }

                // Merge other stats
                if ((issuer.documentsProcessed || 0) > (existing.documentsProcessed || 0)) {
                    existing.documentsProcessed = issuer.documentsProcessed;
                    existing.lastProcessed = issuer.lastProcessed || existing.lastProcessed;
                }

                if (issuer.detailUrl && !existing.detailUrl) {
                    existing.detailUrl = issuer.detailUrl;
                }
            }
        });

        const issuers = Array.from(consolidatedMap.values())
            //.filter(i => i.documents.length > 0) // Removed to allow whitelisted issuers without docs
            .sort((a, b) => b.documents.length - a.documents.length);

        // Cache for 1 hour
        res.set("Cache-Control", "public, max-age=3600, s-maxage=3600");
        res.json({
            issuers,
            source: configDoc.exists ? 'firestore_config' : 'hardcoded_fallback'
        });
    } catch (error) {
        functions.logger.error("Error in /issuers endpoint:", error);
        res.status(500).send("Error reading from database.");
    }
};

exports.getIssuerById = async (req, res) => {
    const { id } = req.params;
    try {
        const issuersSnapshot = await db.collection("issuers").get();
        const allIssuers = issuersSnapshot.docs.map(doc => {
            const data = doc.data();
            delete data.id;
            return { ...data, id: doc.id };
        });
        const issuer = allIssuers.find(i => i.id === id || normalizeIssuerName(i.name) === id);

        if (!issuer) {
            return res.status(404).json({ error: "Issuer not found" });
        }

        res.json(issuer);
    } catch (error) {
        functions.logger.error(`Error fetching issuer ${id}:`, error);
        res.status(500).send("Error fetching issuer detail");
    }
};

exports.getIssuerDocuments = async (req, res) => {
    const { issuerName } = req.query;
    if (!issuerName) {
        return res.status(400).send('Missing "issuerName" query parameter.');
    }
    try {
        const normalizedName = normalizeIssuerName(decodeURIComponent(issuerName));
        const docRef = db.collection("issuers").doc(normalizedName);
        const doc = await docRef.get();
        if (!doc.exists) {
            return res.status(404).send("Issuer not found.");
        }
        res.set("Cache-Control", "public, max-age=300, s-maxage=300");
        res.json({ documents: doc.data().documents || [] });
    } catch (error) {
        functions.logger.error(`Error in /issuer-documents for ${issuerName}:`, error);
        res.status(500).send("Error reading documents from database.");
    }
};

exports.seedIssuers = async (req, res) => {
    try {
        const batch = db.batch();

        const getBaseName = (issuer) => {
            if (issuer.acronym) return issuer.acronym.toLowerCase();
            return issuer.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
        };

        let count = 0;
        for (const issuer of staticIssuers) {
            const baseName = getBaseName(issuer);
            const docRef = db.collection("issuers").doc(baseName);
            batch.set(docRef, {
                id: baseName,
                name: issuer.name,
                acronym: issuer.acronym,
                sector: issuer.sector,
                documents: [],
                lastUpdated: new Date().toISOString()
            }, { merge: true });
            count++;
        }

        await batch.commit();
        res.json({ success: true, message: `Seeded ${count} issuers successfully` });
    } catch (error) {
        functions.logger.error("Error seeding issuers:", error);
        res.status(500).json({ error: error.message });
    }
};

exports.addDocumentManual = async (req, res) => {
    const { issuerId } = req.params;
    const { url, title, date, type } = req.body;

    // Basic Input Sanitization
    const sanitize = (str) => typeof str === 'string' ? str.replace(/[<>]/g, '').trim() : str;
    const cleanUrl = typeof url === 'string' ? url.trim() : null;
    const cleanTitle = sanitize(title);
    const cleanDate = sanitize(date);
    const cleanType = sanitize(type);

    if (!cleanUrl || !cleanTitle) {
        return res.status(400).json({ error: "URL and title are required" });
    }

    try {
        const issuerDoc = await db.collection("issuers").doc(issuerId).get();

        if (!issuerDoc.exists) {
            return res.status(404).json({ error: "Issuer not found" });
        }

        // Validate URL format
        try {
            new URL(cleanUrl);
        } catch (e) {
            return res.status(400).json({ error: "Invalid URL format" });
        }

        const fileName = path.basename(new URL(cleanUrl).pathname) || `doc_${Date.now()}.pdf`;
        const destination = `documents/${issuerId}/${fileName}`;

        const publicUrl = await downloadAndStore(cleanUrl, destination);

        if (!publicUrl) {
            return res.status(500).json({ error: "Failed to download document" });
        }

        const newDoc = {
            title: cleanTitle,
            date: cleanDate || new Date().toISOString(),
            type: cleanType || 'Manual Upload',
            url: publicUrl,
            originalUrl: cleanUrl
        };

        await db.collection("issuers").doc(issuerId).update({
            documents: admin.firestore.FieldValue.arrayUnion(newDoc)
        });

        res.json({ success: true, document: newDoc });

    } catch (error) {
        functions.logger.error(`Error adding document for ${issuerId}:`, error);
        res.status(500).json({ error: error.message });
    }
};
