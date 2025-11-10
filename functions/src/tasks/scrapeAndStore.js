
const { getFirestore } = require("firebase-admin/firestore");
const functions = require("firebase-functions");
const { scrapeIssuers } = require("../scrapers/getIssuers");
const { scrapeBolsanicDocuments } = require("../scrapers/getBolsanicDocuments");
const { scrapeBolsanicFacts } = require("../scrapers/getBolsanicFacts"); // <- El nuevo scraper
const { scrapeBcnExchangeRate } = require("../scrapers/getBcnRates");

const scrapeAndStore = async () => {
  const db = getFirestore();
  functions.logger.info("Starting unified scraping process from BOLSANC...");

  // 1. Scrape all primary sources concurrently for maximum efficiency
  const [issuers, allFacts, exchangeRate] = await Promise.all([
    scrapeIssuers(),
    scrapeBolsanicFacts(),
    scrapeBcnExchangeRate()
  ]);

  functions.logger.info(`Found ${issuers.length} issuers and ${allFacts.length} total facts.`);

  // Store the exchange rate separately
  if (exchangeRate) {
    const bcnRef = db.collection("bcn").doc("exchangeRate");
    await bcnRef.set({ rate: exchangeRate, lastUpdated: new Date() });
    functions.logger.info("Successfully stored BCN exchange rate.");
  }

  // 2. Group facts by issuer name for efficient lookup
  const factsByIssuer = new Map();
  allFacts.forEach(fact => {
    const issuerFacts = factsByIssuer.get(fact.issuerName) || [];
    issuerFacts.push(fact);
    factsByIssuer.set(fact.issuerName, issuerFacts);
  });

  const batch = db.batch();

  // 3. Process each issuer
  for (const issuer of issuers) {
    functions.logger.info(`Processing issuer: ${issuer.name}`);

    // Get documents from the issuer's specific detail page
    const bolsanicDocs = await scrapeBolsanicDocuments(issuer.detailUrl).catch(e => {
      functions.logger.error(`Failed to scrape documents for ${issuer.name}`, e);
      return [];
    });

    // Get the pre-scraped "Hechos Relevantes" for this issuer
    const relevantFacts = factsByIssuer.get(issuer.name) || [];

    // Combine all documents for the issuer
    const allDocuments = [...bolsanicDocs, ...relevantFacts];
    
    const issuerRef = db.collection("issuers").doc(issuer.name);
    
    // 4. Add issuer data to the batch
    batch.set(issuerRef, {
      id: issuer.name,
      name: issuer.name,
      acronym: issuer.acronym || "", // This should be populated by scrapeBolsanicDocuments
      sector: issuer.sector || "N/A",
      detailUrl: issuer.detailUrl,
    });
    
    functions.logger.info(`Found ${allDocuments.length} total documents for ${issuer.name}. Adding to batch.`);

    // 5. Add all documents to the subcollection in the batch
    allDocuments.forEach(doc => {
      // Create a unique-enough ID based on title and date to avoid duplicates
      const docId = `${doc.type}-${doc.date}-${doc.title}`.replace(/[^a-zA-Z0-9]/g, '-');
      const docRef = issuerRef.collection("documents").doc(docId);
      batch.set(docRef, doc);
    });
  }

  functions.logger.info("Committing all data to Firestore...");
  await batch.commit();
  functions.logger.info("Successfully saved all scraped data from BOLSANC to Firestore.");
};

module.exports = { scrapeAndStore };
