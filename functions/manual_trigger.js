
const admin = require("firebase-admin");
const { getFirestore } = require("firebase-admin/firestore");
const { scrapeIssuers } = require("./src/scrapers/getIssuers");
const { scrapeBolsanicDocuments } = require("./src/scrapers/getBolsanicDocuments");
const { scrapeBolsanicFacts } = require("./src/scrapers/getBolsanicFacts");
const { consolidateIssuers, getBaseName } = require("./src/utils/issuerConsolidation");

// Initialize Firebase Admin
admin.initializeApp({
    projectId: "mvp-nic-market"
});

const db = getFirestore();

async function runManualScrape() {
    console.log("Starting manual scrape...");

    const consolidatedIssuers = {};

    // 1. Scrape all data sources
    console.log("Scraping sources...");
    const [issuersFromList, factsFromBolsanic] = await Promise.all([
        scrapeIssuers(),
        scrapeBolsanicFacts(),
    ]);
    console.log(`Scraped ${issuersFromList.length} issuers from list and ${factsFromBolsanic.length} facts.`);

    // 2. Consolidate issuers from the main list
    // Use the improved consolidation logic from utils
    const consolidatedList = consolidateIssuers(issuersFromList);

    // Convert to map for the rest of the script
    consolidatedList.forEach(issuer => {
        consolidatedIssuers[issuer.id] = {
            ...issuer,
            documents: issuer.documents || []
        };
    });

    // 3. Scrape and merge documents for each issuer
    console.log("Scraping documents (this may take a while)...");
    const documentPromises = Object.values(consolidatedIssuers)
        .filter(issuer => issuer.detailUrl)
        .map(issuer =>
            scrapeBolsanicDocuments(issuer.detailUrl).then(docs => ({
                normalizedName: issuer.id,
                documents: docs,
            }))
        );

    const results = await Promise.allSettled(documentPromises);
    results.forEach(result => {
        if (result.status === 'fulfilled') {
            const { normalizedName, documents } = result.value;
            if (consolidatedIssuers[normalizedName]) {
                consolidatedIssuers[normalizedName].documents.push(...documents);
            }
        } else {
            console.error(`Failed to scrape documents for an issuer: ${result.reason}`);
        }
    });

    // 4. Merge "Hechos Relevantes"
    for (const fact of factsFromBolsanic) {
        const normalizedIssuerName = getBaseName(fact.issuerName);
        if (consolidatedIssuers[normalizedIssuerName]) {
            consolidatedIssuers[normalizedIssuerName].documents.push(fact);
        } else {
            // Only add if it maps to a whitelisted issuer, or if we want to keep unknown ones (but consolidateIssuers filters by whitelist now)
            // If we want to strictly follow whitelist, we should ignore unknown ones.
            // But let's check if getBaseName returns something valid.
            if (normalizedIssuerName) {
                // If it's not in consolidatedIssuers but getBaseName returned something, it might be a valid issuer that wasn't in the scraped list?
                // Or maybe it's an alias that maps to a whitelisted one.
                // If it maps to a whitelisted one, it SHOULD be in consolidatedIssuers if the scraped list had it.
                // If the scraped list missed it, maybe we should add it?
                // But consolidateIssuers filters by WHITELIST.
                // So if it's not in consolidatedIssuers, it's either not in WHITELIST or wasn't in the scrape.

                // Let's just log a warning and skip for now to be safe and clean.
                // console.warn(`Fact found for issuer '${fact.issuerName}' (normalized: ${normalizedIssuerName}) which is not in the main list.`);
            }
        }
    }

    // 5. Merge with existing data (Upsert Strategy) - THE FIX
    console.log("Merging with database...");
    const snapshot = await db.collection("issuers").get();
    const existingIssuers = new Map();
    snapshot.forEach(doc => existingIssuers.set(doc.id, doc.data()));

    const writeBatch = db.batch();
    let updatesCount = 0;

    for (const issuer of Object.values(consolidatedIssuers)) {
        const baseName = issuer.displayName || issuer.name;
        const isFinancial = ["banco", "financiera", "fondo de inversion", "puesto de bolsa", "sociedad de inversion"].some(term => baseName.toLowerCase().includes(term));

        // Prepare new data
        const newData = {
            ...issuer,
            sector: isFinancial ? "Privado" : "Público",
            lastScraped: new Date().toISOString()
        };

        // Check if exists to preserve critical fields
        if (existingIssuers.has(issuer.id)) {
            const existing = existingIssuers.get(issuer.id);

            if (existing.isActive !== undefined) newData.isActive = existing.isActive;
            if (existing.documentsProcessed !== undefined) newData.documentsProcessed = existing.documentsProcessed;
            if (existing.lastProcessed !== undefined) newData.lastProcessed = existing.lastProcessed;
            if (existing.logoUrl && !newData.logoUrl) newData.logoUrl = existing.logoUrl;

            const combinedDocs = [...(existing.documents || []), ...newData.documents];
            const uniqueDocsMap = new Map();
            combinedDocs.forEach(d => uniqueDocsMap.set(d.url, d));
            newData.documents = Array.from(uniqueDocsMap.values());
        } else {
            const uniqueDocuments = Array.from(new Map(issuer.documents.map(doc => [doc.url, doc])).values());
            newData.documents = uniqueDocuments;
            newData.isActive = newData.isActive || false;
            newData.documentsProcessed = 0;
        }

        const docRef = db.collection("issuers").doc(issuer.id);
        writeBatch.set(docRef, newData, { merge: true });
        updatesCount++;
    }

    await writeBatch.commit();
    console.log(`Success! Updated/Created ${updatesCount} issuers.`);
}

runManualScrape().catch(console.error);
