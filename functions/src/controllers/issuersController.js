const { getFirestore } = require("firebase-admin/firestore");
const admin = require("firebase-admin");
const functions = require("firebase-functions");
const path = require('path');
const { normalizeIssuerName } = require("../utils/normalization");
const { issuers: staticIssuers } = require('../data/issuers');
const { downloadAndStore } = require('../tasks/scrapeAndStore');

const db = getFirestore();

exports.getAllIssuers = async (req, res) => {
    try {
        const issuersSnapshot = await db.collection("issuers").orderBy("name").get();
        const issuers = issuersSnapshot.docs.map(doc => doc.data());
        res.set("Cache-Control", "public, max-age=3600, s-maxage=3600");
        res.json({ issuers });
    } catch (error) {
        functions.logger.error("Error in /issuers endpoint:", error);
        res.status(500).send("Error reading from database.");
    }
};

exports.getIssuerById = async (req, res) => {
    const { id } = req.params;
    try {
        const issuersSnapshot = await db.collection("issuers").get();
        const allIssuers = issuersSnapshot.docs.map(doc => doc.data());
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

    if (!url || !title) {
        return res.status(400).json({ error: "URL and title are required" });
    }

    try {
        const issuerDoc = await db.collection("issuers").doc(issuerId).get();

        if (!issuerDoc.exists) {
            return res.status(404).json({ error: "Issuer not found" });
        }

        const fileName = path.basename(new URL(url).pathname) || `doc_${Date.now()}.pdf`;
        const destination = `documents/${issuerId}/${fileName}`;

        const publicUrl = await downloadAndStore(url, destination);

        if (!publicUrl) {
            return res.status(500).json({ error: "Failed to download document" });
        }

        const newDoc = {
            title,
            date: date || new Date().toISOString(),
            type: type || 'Manual Upload',
            url: publicUrl,
            originalUrl: url
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
