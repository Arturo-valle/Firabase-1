const functions = require("firebase-functions");
const { getFirestore } = require("firebase-admin/firestore");
const { processIssuerDocuments } = require('../services/documentProcessor');
const { syncIssuers } = require('../tasks/syncIssuers');
const { downloadAndStore } = require('../utils/syncUtils');
const path = require("path");

const db = getFirestore();
const WHITELIST = ["agricorp", "banpro", "bdf", "fama", "fdl", "fid", "horizonte"];

exports.getSystemStatus = async (req, res) => {
    try {
        const issuersSnapshot = await db.collection("issuers").get();
        const allIssuers = issuersSnapshot.docs.map(doc => {
            const data = doc.data();
            return { ...data, id: doc.id };
        });

        const consolidated = allIssuers.filter(i => WHITELIST.includes(i.id));

        // Fetch real counts from documentChunks
        const processedStats = await Promise.all(consolidated.map(async (issuer) => {
            const chunksSnap = await db.collection('documentChunks')
                .where('issuerId', '==', issuer.id)
                .count()
                .get();

            // Heuristic for documents: distinct titles in chunks is too slow, 
            // so we use documentsProcessed if it exists, or just reports chunks
            const chunksCount = chunksSnap.data().count;

            return {
                id: issuer.id,
                name: issuer.name,
                chunks: chunksCount,
                totalDocs: issuer.documents?.length || 0,
                processedDocs: issuer.documentsProcessed || 0
            };
        }));

        const totalDocsAvailable = processedStats.reduce((acc, i) => acc + i.totalDocs, 0);
        const totalDocsProcessed = processedStats.reduce((acc, i) => acc + i.processedDocs, 0);
        const totalChunks = processedStats.reduce((acc, i) => acc + i.chunks, 0);

        const coverage = totalDocsAvailable > 0
            ? ((totalDocsProcessed / totalDocsAvailable) * 100).toFixed(2) + "%"
            : "0%";

        res.json({
            systemHealth: totalDocsProcessed < (totalDocsAvailable * 0.5) ? "Degraded" : "Operational",
            stats: {
                totalIssuers: consolidated.length,
                processedIssuers: consolidated.length,
                coverage,
                totalDocumentsAvailable: totalDocsAvailable,
                totalDocumentsProcessed: totalDocsProcessed,
                totalChunksGenerated: totalChunks
            },
            processedIssuers: processedStats.map(i => ({
                id: i.id,
                name: i.name,
                processed: i.processedDocs,
                total: i.totalDocs,
                chunks: i.chunks,
                lastProcessed: new Date().toISOString()
            }))
        });
    } catch (error) {
        functions.logger.error("Error fetching status:", error);
        res.status(500).send("Error fetching system status");
    }
};

exports.triggerProcessing = async (req, res) => {
    const { issuerId } = req.params;
    const maxDocs = parseInt(req.query.max) || 10;
    try {
        const issuerDoc = await db.collection("issuers").doc(issuerId).get();
        if (!issuerDoc.exists) return res.status(404).json({ error: "Issuer not found" });

        const issuer = issuerDoc.data();
        const result = await processIssuerDocuments(issuerId, issuer.name, issuer.documents || [], maxDocs);
        res.json({ success: true, result });
    } catch (error) {
        functions.logger.error(`Error processing documents for ${issuerId}:`, error);
        res.status(500).json({ error: error.message });
    }
};

exports.triggerScrape = async (req, res) => {
    try {
        await syncIssuers();
        res.json({ success: true, message: "Sync and Scraping triggered successfully" });
    } catch (error) {
        functions.logger.error("Error executing sync/scraper:", error);
        res.status(500).json({ error: error.message });
    }
};

exports.fixStorageUrls = async (req, res) => {
    try {
        const issuersSnapshot = await db.collection("issuers").get();
        let totalMigrated = 0;

        for (const doc of issuersSnapshot.docs) {
            const issuerId = doc.id;
            const data = doc.data();
            const documents = data.documents || [];
            let changed = false;
            const updatedDocs = [];

            for (const fileDoc of documents) {
                if (fileDoc.url.includes('firebasestorage.app') || fileDoc.url.includes('storage.googleapis.com')) {
                    updatedDocs.push(fileDoc);
                    continue;
                }

                const fileName = path.basename(new URL(fileDoc.url, "https://www.bolsanic.com").pathname) || `doc_${Date.now()}.pdf`;
                const destination = `documents/${issuerId}/${fileName}`;
                const publicUrl = await downloadAndStore(fileDoc.url, destination);

                if (publicUrl) {
                    updatedDocs.push({
                        ...fileDoc,
                        url: publicUrl,
                        originalUrl: fileDoc.url,
                        migratedAt: new Date()
                    });
                    changed = true;
                    totalMigrated++;
                } else {
                    updatedDocs.push(fileDoc);
                }
            }

            if (changed) {
                await db.collection("issuers").doc(issuerId).update({
                    documents: updatedDocs,
                    lastMaintenanceSync: new Date()
                });
            }
        }

        res.json({ success: true, totalMigrated });
    } catch (error) {
        functions.logger.error("Error in fixStorageUrls:", error);
        res.status(500).json({ error: error.message });
    }
};
