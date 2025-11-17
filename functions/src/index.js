const functions = require("firebase-functions");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");
const { getFirestore } = require("firebase-admin/firestore");

const { scrapeIssuers } = require("./scrapers/getIssuers");
const { scrapeBolsanicDocuments } = require("./scrapers/getBolsanicDocuments");
const { scrapeBolsanicFacts } = require("./scrapers/getBolsanicFacts");
const { scrapeBcnRates } = require("./scrapers/getBcnRates");

// Initialize Firebase Admin SDK
admin.initializeApp();
const db = getFirestore();

// --- Helper Functions ---

/**
 * Normalizes an issuer name to create a consistent ID.
 * - Removes common suffixes like ", S.A."
 * - Removes content in parentheses, e.g., "(Banpro)"
 * - Trims whitespace
 * @param {string} name The original issuer name.
 * @returns {string} The normalized name.
 */
function normalizeIssuerName(name) {
  if (!name) return "";
  return name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/, s\.a\./gi, '')
    .replace(/, s\.a/gi, '')
    .replace(/\s*\(.*?\)/g, '')
    .replace(/,$/g, '')
    .trim();
}

// --- API Router Setup ---
const app = express();
app.use(cors({ origin: true }));

app.use((req, res, next) => {
  functions.logger.info(`API Request: ${req.method} ${req.originalUrl}`);
  next();
});

// --- API Endpoints ---

app.get("/bcn", async (req, res) => {
  try {
    const rates = await scrapeBcnRates();
    res.set("Cache-Control", "public, max-age=3600, s-maxage=3600");
    res.status(200).json(rates);
  } catch (error) {
    functions.logger.error("Error in /bcn endpoint:", error);
    res.status(500).send("Failed to fetch BCN exchange rates.");
  }
});

app.get("/issuers", async (req, res) => {
  try {
    const issuersSnapshot = await db.collection("issuers").orderBy("name").get();
    const issuers = issuersSnapshot.docs.map(doc => doc.data());
    res.set("Cache-Control", "public, max-age=3600, s-maxage=3600");
    res.json({ issuers });
  } catch (error) {
    functions.logger.error("Error in /issuers endpoint:", error);
    res.status(500).send("Error reading from database.");
  }
});

app.get("/issuer-documents", async (req, res) => {
  const { issuerName } = req.query;
  if (!issuerName) {
    return res.status(400).send('Missing "issuerName" query parameter.');
  }
  try {
    const normalizedName = normalizeIssuerName(decodeURIComponent(issuerName));
    const docRef = db.collection("issuers").doc(normalizedName);
    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).send("Issuer not found.");
    }
    res.set("Cache-Control", "public, max-age=300, s-maxage=300");
    res.json({ documents: doc.data().documents || [] });
  } catch (error) {
    functions.logger.error(`Error in /issuer-documents for ${issuerName}:`, error);
    res.status(500).send("Error reading documents from database.");
  }
});

// --- Cloud Function Exports ---

exports.api = functions
  .region('us-central1')
  .runWith({ timeoutSeconds: 120, memory: '256MB' })
  .https.onRequest(app);

exports.scrapeAndStoreTask = functions
  .region('us-central1')
  .runWith({ timeoutSeconds: 540, memory: '2GB' })
  .pubsub.schedule('every 24 hours')
  .onRun(async (context) => {
    functions.logger.info("Daily scraping task triggered...");
    
    const consolidatedIssuers = {};

    // 1. Scrape all data sources
    const [issuersFromList, factsFromBolsanic] = await Promise.all([
      scrapeIssuers(),
      scrapeBolsanicFacts(),
    ]);
    functions.logger.info(`Scraped ${issuersFromList.length} issuers from list and ${factsFromBolsanic.length} facts.`);

    // 2. Consolidate issuers from the main list
    for (const issuer of issuersFromList) {
      const normalizedName = normalizeIssuerName(issuer.name);
      if (!consolidatedIssuers[normalizedName]) {
        consolidatedIssuers[normalizedName] = {
          ...issuer,
          id: normalizedName,
          name: issuer.name,
          displayName: issuer.name,
          documents: [],
        };
      }
    }

    // 3. Scrape and merge documents for each issuer
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
        functions.logger.error(`Failed to scrape documents for an issuer: ${result.reason}`);
      }
    });
    
    // 4. Merge "Hechos Relevantes"
    for (const fact of factsFromBolsanic) {
      const normalizedIssuerName = normalizeIssuerName(fact.issuerName);
      if (consolidatedIssuers[normalizedIssuerName]) {
        consolidatedIssuers[normalizedIssuerName].documents.push(fact);
      } else {
        functions.logger.warn(`Fact found for an unlisted issuer: '${fact.issuerName}'. Creating new entry.`);
        consolidatedIssuers[normalizedIssuerName] = {
          id: normalizedIssuerName,
          name: fact.issuerName,
          displayName: fact.issuerName,
          acronym: "",
          sector: "Desconocido",
          detailUrl: "",
          documents: [fact],
        };
      }
    }

    // 5. Delete old data
    const snapshot = await db.collection("issuers").get();
    if (!snapshot.empty) {
      const deleteBatch = db.batch();
      snapshot.docs.forEach(doc => deleteBatch.delete(doc.ref));
      await deleteBatch.commit();
      functions.logger.info(`Cleared ${snapshot.size} old issuer documents.`);
    }

    // 6. Write new, consolidated data
    const writeBatch = db.batch();
    for (const issuer of Object.values(consolidatedIssuers)) {
        const baseName = issuer.displayName || issuer.name;
        const isFinancial = ["banco", "financiera", "fondo de inversion", "puesto de bolsa", "sociedad de inversion"].some(term => baseName.toLowerCase().includes(term));
        issuer.sector = isFinancial ? "Privado" : "Público";
        issuer.lastScraped = new Date().toISOString();
        
        // Remove duplicate documents by URL
        const uniqueDocuments = Array.from(new Map(issuer.documents.map(doc => [doc.url, doc])).values());
        issuer.documents = uniqueDocuments;

        const docRef = db.collection("issuers").doc(issuer.id);
        writeBatch.set(docRef, issuer);
    }
    await writeBatch.commit();

    functions.logger.info(`Scraping task finished. Stored ${Object.keys(consolidatedIssuers).length} consolidated issuers.`);
});
