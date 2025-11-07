
const { getFirestore } = require("firebase-admin/firestore");
const { scrapeIssuers } = require("../scrapers/getIssuers");
const { scrapeBolsanicDocuments } = require("../scrapers/getBolsanicDocuments");
const { scrapeSiboifFacts } = require("../scrapers/getSiboifFacts");

/**
 * This function is the heart of the data ingestion process.
 * It scrapes all data sources and stores the results in Firestore.
 *
 * @returns {Promise<object>} An object containing the results of the operation.
 */
async function scrapeAndStore() {
  const db = getFirestore();
  const issuers = await scrapeIssuers();
  let totalDocumentsFound = 0;

  console.log(`Found ${issuers.length} issuers. Now scraping documents for each...`);

  // We use Promise.all to run scraping tasks in parallel for all issuers.
  const allScrapingPromises = issuers.map(async (issuer) => {
    try {
      console.log(`Scraping documents for: ${issuer.name}`);
      const [bolsanicDocs, siboifFacts] = await Promise.all([
        scrapeBolsanicDocuments(issuer.detailUrl),
        scrapeSiboifFacts(issuer.name),
      ]);

      const allDocuments = [...bolsanicDocs, ...siboifFacts];
      totalDocumentsFound += allDocuments.length;

      // Firestore operations: Create a batch to perform multiple writes efficiently.
      const batch = db.batch();

      // 1. Set the issuer document (includes name, acronym, sector, etc.)
      const issuerRef = db.collection("issuers").doc(issuer.name);
      batch.set(issuerRef, { ...issuer, lastUpdated: new Date() });

      // 2. Add all found documents to a subcollection within the issuer.
      allDocuments.forEach((doc) => {
        // Create a unique ID for the document to avoid duplicates.
        // A simple hash of the URL is a good candidate.
        const docId = doc.url.replace(/[^a-zA-Z0-9]/g, "");
        const docRef = issuerRef.collection("documents").doc(docId);
        batch.set(docRef, doc);
      });

      // Commit the batch of writes to Firestore.
      await batch.commit();
      console.log(`Successfully stored ${allDocuments.length} documents for ${issuer.name}.`);
      
      return { issuer: issuer.name, status: "success", count: allDocuments.length };
    } catch (error) {
      console.error(`Error scraping or storing for ${issuer.name}:`, error);
      return { issuer: issuer.name, status: "error", message: error.message };
    }
  });

  // Wait for all scraping and storing tasks to complete.
  const results = await Promise.all(allScrapingPromises);
  
  console.log("Scraping and storing process completed.");
  return {
    summary: `Processed ${issuers.length} issuers. Found a total of ${totalDocumentsFound} documents.`,
    results: results,
  };
}

module.exports = { scrapeAndStore };

