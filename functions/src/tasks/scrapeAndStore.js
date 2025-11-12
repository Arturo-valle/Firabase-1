
const { getFirestore } = require("firebase-admin/firestore");
const functions = require("firebase-functions");
const { scrapeIssuers } = require("../scrapers/getIssuers");
const { scrapeBolsanicDocuments } = require("../scrapers/getBolsanicDocuments");
const { scrapeBolsanicFacts } = require("../scrapers/getBolsanicFacts");
const { scrapeBcnExchangeRate } = require("../scrapers/getBcnRates");

// --- Helper Functions ---
const getBaseName = (name) => name.split(',')[0].split('(')[0].trim();

/**
 * The main task to scrape all data, consolidate it, download documents, and store everything correctly in Firestore.
 */
const scrapeAndStore = async () => {
  const db = getFirestore();
  functions.logger.info("Starting unified scraping process...");

  // 1. Scrape all primary sources concurrently.
  const [rawIssuers, allFacts, exchangeRate] = await Promise.all([
    scrapeIssuers(),
    scrapeBolsanicFacts(),
    scrapeBcnExchangeRate(),
  ]);

  functions.logger.info(`Found ${rawIssuers.length} raw issuers and ${allFacts.length} total facts.`);

  // 2. Store the exchange rate separately.
  if (exchangeRate) {
    const bcnRef = db.collection("bcn").doc("exchangeRate");
    await bcnRef.set({ rate: exchangeRate, lastUpdated: new Date() });
    functions.logger.info("Successfully stored BCN exchange rate.");
  }

  // 3. Consolidate all issuers and facts into a single map.
  const consolidatedMap = new Map();

  // Add issuers from the main list
  for (const issuer of rawIssuers) {
    const baseName = getBaseName(issuer.name);
    if (!consolidatedMap.has(baseName)) {
      consolidatedMap.set(baseName, { ...issuer, documents: [] });
    }
  }

  // Add facts, creating a placeholder issuer if it doesn't exist.
  for (const fact of allFacts) {
    const baseName = getBolsanicFacts(fact.issuerName);
    const existing = consolidatedMap.get(baseName);
    if (existing) {
      existing.documents.push(fact);
    } else {
      // This case is unlikely but handled for safety.
      consolidatedMap.set(baseName, { name: baseName, documents: [fact], detailUrl: null });
    }
  }

  functions.logger.info(`Consolidated to ${consolidatedMap.size} unique issuers.`);

  // 4. Process each unique issuer: scrape their specific docs and commit to Firestore.
  const batch = db.batch();
  for (const [baseName, issuerData] of consolidatedMap.entries()) {
    functions.logger.info(`Processing unique issuer: ${baseName}`);
    
    // Scrape detail page documents *and* upload them to Storage
    const detailPageDocs = issuerData.detailUrl ? await scrapeBolsanicDocuments(issuerData.detailUrl, baseName) : [];
    
    // Combine all documents
    const allDocuments = [...(issuerData.documents || []), ...detailPageDocs];
    const uniqueDocuments = Array.from(new Map(allDocuments.map(doc => [doc.url, doc])).values());
    
    // Use baseName as the document ID for a stable, unique reference
    const issuerRef = db.collection("issuers").doc(baseName);
    
    batch.set(issuerRef, {
      id: baseName,
      name: issuerData.name,
      acronym: issuerData.acronym || "",
      sector: issuerData.sector || "N/A",
      documents: uniqueDocuments, // Overwrite with the full, correct list
    });
  }

  functions.logger.info("Committing all data to Firestore...");
  await batch.commit();
  functions.logger.info("Scraping and storing process completed successfully.");
};

module.exports = { scrapeAndStore };
