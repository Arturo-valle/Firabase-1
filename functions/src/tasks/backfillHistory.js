const functions = require("firebase-functions");
const { getFirestore } = require("firebase-admin/firestore");
const { extractHistoricalMetrics } = require("../services/metricsExtractor");

/**
 * Task to backfill historical metrics for all active issuers.
 * Can be triggered via HTTP for initial setup.
 */
async function backfillHistory(req, res) {
    const db = getFirestore();
    try {
        functions.logger.info("Starting historical data backfill...");

        // Get all active issuers
        const issuersSnapshot = await db.collection("issuers")
            .where("active", "==", true)
            .get();

        const results = [];

        for (const doc of issuersSnapshot.docs) {
            const issuer = doc.data();
            functions.logger.info(`Processing history for ${issuer.name} (ID: ${doc.id})...`);

            try {
                // Only process if they have documents
                if (issuer.documents && issuer.documents.length > 0) {
                    await extractHistoricalMetrics(doc.id, issuer.name);
                    results.push({ issuer: issuer.name, status: "success" });
                } else {
                    results.push({ issuer: issuer.name, status: "skipped_no_docs" });
                }

                // Rate limiting protection
                await new Promise(r => setTimeout(r, 2000));
            } catch (err) {
                functions.logger.error(`Failed to process ${issuer.name}:`, err);
                results.push({ issuer: issuer.name, status: "error", error: err.message });
            }
        }

        functions.logger.info("Backfill complete", results);
        if (res) {
            res.json({ success: true, results });
        }
    } catch (error) {
        functions.logger.error("Fatal error in backfill:", error);
        if (res) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = { backfillHistory };
