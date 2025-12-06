const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { scrapeIssuers } = require("../scrapers/getIssuers");
const { scrapeBolsanicDocuments } = require("../scrapers/getBolsanicDocuments");
const { scrapeBolsanicFacts } = require("../scrapers/getBolsanicFacts");
const { processAllDocuments } = require("./processDocuments");

/**
 * Scheduled task to sync issuers and their documents/facts.
 * Runs every 24 hours.
 */
async function syncIssuers() {
    functions.logger.info("Starting syncIssuers task...");
    const db = admin.firestore();

    try {
        // 1. Scrape Active Issuers (this already saves to Firestore 'issuers' and 'system/market_metadata')
        const issuers = await scrapeIssuers();
        const activeIssuers = issuers.filter(i => i.active);
        functions.logger.info(`Found ${activeIssuers.length} active issuers.`);

        // 2. Scrape Facts (Hechos Relevantes)
        const facts = await scrapeBolsanicFacts();
        functions.logger.info(`Found ${facts.length} relevant events.`);

        // 3. Process each active issuer to get their documents and match facts
        for (const issuer of activeIssuers) {
            const issuerId = issuer.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
            functions.logger.info(`Syncing documents for ${issuer.name} (${issuerId})...`);

            let documents = [];

            // A. Scrape Documents from detail page
            if (issuer.detailUrl) {
                try {
                    const scrapedDocs = await scrapeBolsanicDocuments(issuer.detailUrl);
                    documents = scrapedDocs.map(d => ({ ...d, type: 'Informe', source: 'Detail Page' }));
                } catch (e) {
                    functions.logger.error(`Error scraping docs for ${issuer.name}:`, e);
                }
            }

            // B. Match Facts to this issuer
            const issuerFacts = facts.filter(f => {
                // Simple matching logic - can be improved
                const normFactIssuer = f.issuerName.toLowerCase();
                const normName = issuer.name.toLowerCase();
                return normFactIssuer.includes(normName) || normName.includes(normFactIssuer);
            });

            documents.push(...issuerFacts.map(f => ({
                title: f.title,
                url: f.url,
                date: f.date,
                type: 'Hecho Relevante',
                source: 'Hechos Relevantes Page'
            })));

            // C. Update Firestore
            // We use a map to deduplicate by URL
            const uniqueDocs = new Map();
            documents.forEach(d => uniqueDocs.set(d.url, d));

            await db.collection('issuers').doc(issuerId).update({
                documents: Array.from(uniqueDocs.values()),
                lastSync: admin.firestore.FieldValue.serverTimestamp()
            });
        }

        functions.logger.info("Sync complete. Triggering document processing...");

        // 4. Trigger Processing (Embedding)
        // We call the internal function directly
        await processAllDocuments();

        functions.logger.info("syncIssuers task finished successfully.");

    } catch (error) {
        functions.logger.error("Error in syncIssuers:", error);
    }
}

module.exports = { syncIssuers };
