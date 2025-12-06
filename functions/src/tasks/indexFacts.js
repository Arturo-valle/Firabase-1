const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { scrapeBolsanicFacts } = require("../scrapers/getBolsanicFacts");
const { processIssuers } = require("./processDocuments");

/**
 * Task to scrape and index Hechos Relevantes.
 * Can run more frequently (e.g., every hour).
 */
async function indexFacts() {
    functions.logger.info("Starting indexFacts task...");
    const db = admin.firestore();

    try {
        const facts = await scrapeBolsanicFacts();
        if (facts.length === 0) {
            functions.logger.info("No facts found.");
            return;
        }

        const issuersToUpdate = new Set();
        const batch = db.batch();

        // Group facts by issuer
        const factsByIssuer = {};
        for (const fact of facts) {
            const issuerName = fact.issuerName;
            if (!issuerName) continue;

            // Try to find the issuer ID
            // This is a bit inefficient, querying by name for each fact if we don't have a map.
            // Better to fetch all active issuers first.
        }

        // Fetch all active issuers to map names to IDs
        const issuersSnapshot = await db.collection('issuers').where('active', '==', true).get();
        const issuerMap = new Map(); // Name -> ID
        issuersSnapshot.forEach(doc => {
            const data = doc.data();
            issuerMap.set(data.name.toLowerCase(), doc.id);
            // Also map variations if any?
        });

        for (const fact of facts) {
            const normFactIssuer = fact.issuerName.toLowerCase();
            let matchedId = null;

            // Simple match
            for (const [name, id] of issuerMap.entries()) {
                if (normFactIssuer.includes(name) || name.includes(normFactIssuer)) {
                    matchedId = id;
                    break;
                }
            }

            if (matchedId) {
                if (!factsByIssuer[matchedId]) factsByIssuer[matchedId] = [];
                factsByIssuer[matchedId].push(fact);
                issuersToUpdate.add(matchedId);
            }
        }

        // Update Firestore
        for (const issuerId of issuersToUpdate) {
            const newFacts = factsByIssuer[issuerId];
            const docRef = db.collection('issuers').doc(issuerId);
            const doc = await docRef.get();

            if (doc.exists) {
                const currentDocs = doc.data().documents || [];
                const uniqueDocs = new Map(currentDocs.map(d => [d.url, d]));

                let hasChanges = false;
                newFacts.forEach(f => {
                    if (!uniqueDocs.has(f.url)) {
                        uniqueDocs.set(f.url, {
                            title: f.title,
                            url: f.url,
                            date: f.date,
                            type: 'Hecho Relevante',
                            source: 'Hechos Relevantes Page'
                        });
                        hasChanges = true;
                    }
                });

                if (hasChanges) {
                    batch.update(docRef, {
                        documents: Array.from(uniqueDocs.values()),
                        lastFactSync: admin.firestore.FieldValue.serverTimestamp()
                    });
                } else {
                    issuersToUpdate.delete(issuerId); // No need to process if no new facts
                }
            }
        }

        await batch.commit();

        if (issuersToUpdate.size > 0) {
            functions.logger.info(`Found new facts for ${issuersToUpdate.size} issuers. Triggering processing...`);
            await processIssuers(Array.from(issuersToUpdate));
        } else {
            functions.logger.info("No new facts to index.");
        }

    } catch (error) {
        functions.logger.error("Error in indexFacts:", error);
    }
}

module.exports = { indexFacts };
