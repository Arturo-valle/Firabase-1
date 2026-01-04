
const { scrapeBolsanicDocuments } = require('./functions/src/scrapers/getBolsanicDocuments');

async function test() {
    console.log("Testing scraper for Horizonte...");
    const url = "https://invercasasafi.com/fondos-de-inversion/";
    try {
        const docs = await scrapeBolsanicDocuments(url);
        console.log(`Found ${docs.length} documents.`);
        docs.forEach(d => console.log(`- [${d.type}] ${d.title} (${d.date})`));
    } catch (e) {
        console.error("Scraper failed:", e);
    }
}

test();
