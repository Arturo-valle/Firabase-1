const { scrapeBolsanicDocuments } = require('../functions/src/scrapers/getBolsanicDocuments');
const { scrapeIssuers } = require('../functions/src/scrapers/getIssuers');

async function test() {
    console.log("Starting Scraper Diagnosis...");

    // Test 1: Discovery
    console.log("\n--- Testing Discovery (scrapeIssuers) ---");
    try {
        const issuers = await scrapeIssuers();
        console.log(`Discovered ${issuers.length} issuers.`);
        const fid = issuers.find(i => i.name.toLowerCase().includes('fid'));
        const horizonte = issuers.find(i => i.name.toLowerCase().includes('horizonte'));
        console.log("Found FID in list?", !!fid, fid || '');
        console.log("Found Horizonte in list?", !!horizonte, horizonte || '');
    } catch (e) {
        console.error("Error in scrapeIssuers:", e);
    }

    // Test 2: Extraction
    console.log("\n--- Testing Extraction ---");
    const targets = [
        { name: "FID", url: "https://www.bolsanic.com/emisor-fid/" },
        { name: "Horizonte", url: "https://invercasasafi.com/fondos-de-inversion/" }
    ];

    for (const target of targets) {
        console.log(`\nTesting ${target.name} (${target.url})...`);
        try {
            console.time(target.name);
            const docs = await scrapeBolsanicDocuments(target.url);
            console.timeEnd(target.name);

            console.log(`Found ${docs.length} documents for ${target.name}.`);
            if (docs.length > 0) {
                console.log("First doc:", docs[0]);
            } else {
                console.warn(`WARNING: No documents found for ${target.name}!`);
            }
        } catch (e) {
            console.error(`ERROR scraping ${target.name}:`, e.message);
            if (e.response) console.error("Response:", e.response.status);
        }
    }
}

test();
