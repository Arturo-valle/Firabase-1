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

        // MANUAL OVERRIDES to ensure critical issuers are scraped
        const MANUAL_URL_OVERRIDES = {
            'agri-corp': 'https://www.bolsanic.com/emisor-corporacionesagricolas/',
            'agricorp': 'https://www.bolsanic.com/emisor-corporacionesagricolas/',
            'banpro': 'https://www.bolsanic.com/emisor-bancodelaproduccion/',
            'banco de la producción': 'https://www.bolsanic.com/emisor-bancodelaproduccion/',
            'bdf': 'https://www.bolsanic.com/emisor-bancodefinanzas/',
            'banco de finanzas': 'https://www.bolsanic.com/emisor-bancodefinanzas/',
            'fama': 'https://www.bolsanic.com/emisor-financierafama/',
            'financiera fama': 'https://www.bolsanic.com/emisor-financierafama/',
            'fdl': 'https://www.bolsanic.com/emisor-fdl/',
            'financiera fdl': 'https://www.bolsanic.com/emisor-fdl/',
            'fid': 'https://www.bolsanic.com/emisor-fid/',
            'horizonte': 'https://www.bolsanic.com/emisor-horizontefondodeinversion/'
        };

        // FORCE INCLUDE HORIZONTE (Phantom Issuer Fix)
        const hasHorizonte = activeIssuers.some(i => i.name.toLowerCase().includes('horizonte'));
        functions.logger.info(`Phantom Check: hasHorizonte=${hasHorizonte}. Active activeIssuers count: ${activeIssuers.length}`);
        activeIssuers.forEach(i => functions.logger.info(` - Active Issuer: ${i.name} (${i.detailUrl})`));

        if (!hasHorizonte) {
            functions.logger.info("Forcing inclusion of 'Horizonte' (Phantom Issuer)...");
            activeIssuers.push({
                name: "Horizonte Fondo de Inversión",
                acronym: "HORIZONTE",
                sector: "Fondos de Inversión",
                active: true,
                detailUrl: MANUAL_URL_OVERRIDES['horizonte']
            });
        }

        // 3. Process each active issuer to get their documents and match facts
        for (const issuer of activeIssuers) {
            const issuerId = issuer.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
            functions.logger.info(`Syncing documents for ${issuer.name} (${issuerId})...`);

            // Apply URL override if name matches loose pattern
            const lowerName = issuer.name.toLowerCase();
            const lowerAcronym = (issuer.acronym || '').toLowerCase();

            for (const [key, url] of Object.entries(MANUAL_URL_OVERRIDES)) {
                if (lowerName.includes(key) || lowerAcronym === key || issuerId.includes(key)) {
                    functions.logger.info(`Applying manual URL override for ${issuer.name}: ${url}`);
                    issuer.detailUrl = url;
                    break;
                }
            }

            let documents = [];

            // A. Scrape Documents from detail page
            if (issuer.detailUrl) {
                try {
                    const scrapedDocs = await scrapeBolsanicDocuments(issuer.detailUrl);
                    documents = scrapedDocs.map(d => ({ ...d, type: d.type || 'Informe', source: 'Detail Page' }));
                } catch (e) {
                    functions.logger.error(`Error scraping docs for ${issuer.name}:`, e);
                }
            }

            // B. Match Facts to this issuer
            // B. Match Facts to this issuer
            const issuerFacts = facts.filter(f => {
                const normFactIssuer = f.issuerName.toLowerCase();
                const normFactTitle = f.title.toLowerCase();
                const normName = issuer.name.toLowerCase();

                // 1. Direct Name Match (Issuer Name)
                if (normFactIssuer.includes(normName) || normName.includes(normFactIssuer)) return true;

                // 2. Title Match (Crucial for "Desconocido" or "Calificadora")
                if (normFactTitle.includes(normName)) return true;

                // 3. Smart Keyword Match (for known tricky issuers)
                if (issuerId.includes('horizonte') && (normFactIssuer.includes('horizonte') || normFactTitle.includes('horizonte'))) return true;
                if (issuerId.includes('fid') && (normFactIssuer.includes('fid') || normFactTitle.includes('fid'))) return true;
                if (issuerId.includes('fama') && (normFactIssuer.includes('fama') || normFactTitle.includes('fama'))) return true;

                return false;
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

            const scrapedCount = documents.length - issuerFacts.length;
            functions.logger.info(`Issuer ${issuerId}: Scraped ${scrapedCount} docs from page, matched ${issuerFacts.length} facts.`);

            // Also update the detailUrl in Firestore so future runs/frontend have it
            await db.collection('issuers').doc(issuerId).set({
                documents: Array.from(uniqueDocs.values()),
                detailUrl: issuer.detailUrl || null,
                lastSync: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
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
