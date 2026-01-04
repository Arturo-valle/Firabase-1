
const { getFirestore } = require("firebase-admin/firestore");
const functions = require("firebase-functions");

const db = getFirestore();
const WHITELIST = ["agricorp", "banpro", "bdf", "fama", "fdl", "fid", "horizonte"];

/**
 * Cleanup Task: cleanupIssuersTask
 * Removes issuers from Firestore that are not in the official whitelist.
 * This fixes the issue of "long/messy IDs" from previous scraper bugs.
 */
const cleanupIssuers = async (req, res) => {
    try {
        functions.logger.info("Starting Firestore Cleanup: issuers collection...");

        const snapshot = await db.collection("issuers").get();
        const batch = db.batch();
        let deletedCount = 0;
        const deletedIds = [];

        snapshot.docs.forEach(doc => {
            if (!WHITELIST.includes(doc.id)) {
                functions.logger.info(`Marking for deletion: ${doc.id}`);
                batch.delete(doc.ref);
                deletedCount++;
                deletedIds.push(doc.id);
            }
        });

        if (deletedCount > 0) {
            await batch.commit();
            functions.logger.info(`Successfully deleted ${deletedCount} incorrect issuer documents.`);
        } else {
            functions.logger.info("No documents needed cleanup.");
        }

        if (res) {
            res.json({
                success: true,
                deletedCount,
                deletedIds
            });
        }
    } catch (error) {
        functions.logger.error("Error in cleanupIssuers:", error);
        if (res) {
            res.status(500).json({ error: error.message });
        }
        throw error;
    }
};

module.exports = cleanupIssuers;
