const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { scrapeIssuers } = require("../scrapers/getIssuers");
const { scrapeBolsanicDocuments } = require("../scrapers/getBolsanicDocuments");
const { scrapeBolsanicFacts } = require("../scrapers/getBolsanicFacts");
const { processAllDocuments } = require("./processDocuments");

const {
    WHITELIST,
    ALIASES,
    EXTRACTION_MAPPING,
    ISSUER_METADATA
} = require("../utils/issuerConfig");

/**
 * Scheduled task to sync issuers and their documents/facts.
 * Runs every 24 hours.
 */
async function syncIssuers() {
    functions.logger.info("Starting syncIssuers task...");
    const db = admin.firestore();

    // 0. SELF-HEALING CONFIGURATION UPDATE (Now from centralized utility)
    const CONFIG_UPDATE = {
        whitelist: WHITELIST,
        aliases: ALIASES,
        extractionMapping: EXTRACTION_MAPPING,
        metadata: ISSUER_METADATA
    };

    try {
        await db.collection('system_config').doc('issuers').set(CONFIG_UPDATE, { merge: true });
        functions.logger.info("System Config (WhiteList/Aliases) updated.");
    } catch (e) {
        functions.logger.error("Failed to update system config:", e);
    }

    try {
        await db.collection('system_config').doc('issuers').set(CONFIG_UPDATE, { merge: true });
        functions.logger.info("System Config (WhiteList/Aliases) updated.");
    } catch (e) {
        functions.logger.error("Failed to update system config:", e);
    }

    const { downloadAndStore, findBestIssuerMatch } = require("../utils/syncUtils");
    const path = require("path");

    try {
        const issuers = await scrapeIssuers();
        const rawFacts = await scrapeBolsanicFacts();

        const MANUAL_URL_OVERRIDES = {
            'agricorp': 'https://www.bolsanic.com/emisor-corporacionesagricolas/',
            'horizonte': 'https://invercasasafi.com/fondos-de-inversion/'
        };

        const { normalizeIssuerName } = require("../utils/normalization");

        // 1. Map Facts to Issuers more accurately
        const factsByIssuer = new Map();
        rawFacts.forEach(fact => {
            const matchedIssuer = findBestIssuerMatch(fact, issuers);
            if (matchedIssuer) {
                const normalized = normalizeIssuerName(matchedIssuer.name);
                const issuerId = ALIASES[normalized] || normalized;
                if (!factsByIssuer.has(issuerId)) factsByIssuer.set(issuerId, []);
                factsByIssuer.get(issuerId).push({
                    title: fact.title,
                    url: fact.url,
                    date: fact.date,
                    type: 'Hecho Relevante',
                    source: 'Hechos Relevantes Page'
                });
            }
        });

        for (const issuer of issuers) {
            const normalized = normalizeIssuerName(issuer.name);
            const issuerId = ALIASES[normalized] || normalized;

            if (!WHITELIST.includes(issuerId)) continue;

            functions.logger.info(`Syncing documents for ${issuerId}...`);

            if (MANUAL_URL_OVERRIDES[issuerId]) {
                issuer.detailUrl = MANUAL_URL_OVERRIDES[issuerId];
            }

            let documentsToProcess = [];
            if (issuer.detailUrl) {
                try {
                    const scrapedDocs = await scrapeBolsanicDocuments(issuer.detailUrl);
                    documentsToProcess = scrapedDocs.map(d => ({ ...d, source: 'Detail Page' }));
                } catch (e) {
                    functions.logger.error(`Error scraping docs for ${issuerId}:`, e);
                }
            }

            // Append matched facts
            const relatedFacts = factsByIssuer.get(issuerId) || [];
            documentsToProcess.push(...relatedFacts);

            const uniqueDocs = new Map();
            documentsToProcess.forEach(d => uniqueDocs.set(d.url, d));
            const distinctDocs = Array.from(uniqueDocs.values());

            // 2. Download and Store in Firebase Storage (only if not already there or local testing)
            const finalStoredDocuments = [];

            // Limit to most recent 20 docs per issuer to avoid function timeout
            const limitedDocs = distinctDocs.slice(0, 25);

            for (const doc of limitedDocs) {
                try {
                    // Si ya es una URL de storage, no re-descargar
                    if (doc.url.includes('firebasestorage.app') || doc.url.includes('storage.googleapis.com')) {
                        finalStoredDocuments.push(doc);
                        continue;
                    }

                    const fileName = path.basename(new URL(doc.url, "https://www.bolsanic.com").pathname) || `doc_${Date.now()}.pdf`;
                    const destination = `documents/${issuerId}/${fileName}`;

                    const publicUrl = await downloadAndStore(doc.url, destination);

                    finalStoredDocuments.push({
                        ...doc,
                        url: publicUrl || doc.url, // Fallback to original if download fails
                        originalUrl: doc.url,
                        storedInStorage: !!publicUrl
                    });
                } catch (e) {
                    finalStoredDocuments.push(doc);
                }
            }

            await db.collection('issuers').doc(issuerId).set({
                name: ISSUER_METADATA[issuerId]?.name || issuer.name,
                acronym: ISSUER_METADATA[issuerId]?.acronym || issuer.acronym || null,
                sector: ISSUER_METADATA[issuerId]?.sector || issuer.sector || null,
                documents: finalStoredDocuments,
                detailUrl: issuer.detailUrl || null,
                active: true,
                lastSync: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        }

        // We don't trigger full processing here to avoid extreme timeouts
        // instead, the next phase will pick it up or it can be manually triggered.
        // await processAllDocuments(); 

        functions.logger.info("syncIssuers finished.");
    } catch (error) {
        functions.logger.error("Error in syncIssuers:", error);
        throw error;
    }
}

module.exports = { syncIssuers };
