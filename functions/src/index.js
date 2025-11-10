const functions = require("firebase-functions");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");
const { scrapeIssuers } = require("./scrapers/getIssuers");
const { scrapeBolsanicDocuments } = require("./scrapers/getBolsanicDocuments");
const { scrapeSiboifFacts } = require("./scrapers/getSiboifFacts");
const { scrapeBcnRates } = require("./scrapers/getBcnRates");

// Initialize Firebase Admin SDK
admin.initializeApp();
const db = admin.firestore();

// API Router Setup
const apiRouter = express.Router();
apiRouter.use(cors({ origin: true }));

// --- API Endpoints ---

// BCN Rates Endpoint
apiRouter.get("/bcn", async (req, res) => {
  try {
    const rates = await scrapeBcnRates();
    res.status(200).json(rates);
  } catch (error) {
    console.error("Error fetching BCN rates:", error);
    res.status(500).send("Failed to fetch BCN exchange rates.");
  }
});

// Issuers Endpoint (reads from Firestore)
apiRouter.get("/issuers", async (req, res) => {
  try {
    const issuersSnapshot = await db.collection("issuers").orderBy("name").get();
    if (issuersSnapshot.empty) {
      return res.status(404).json({ message: "No issuers found. Please run the scraping task first." });
    }
    const issuers = issuersSnapshot.docs.map(doc => doc.data());
    res.status(200).json({ issuers });
  } catch (error) {
    console.error("Error fetching issuers from Firestore:", error);
    res.status(500).send("Failed to fetch issuers from the database.");
  }
});

// Issuer Documents Endpoint (reads from Firestore)
apiRouter.get("/issuer-documents", async (req, res) => {
    const issuerName = req.query.issuerName;
    if (!issuerName) {
        return res.status(400).send("issuerName query parameter is required.");
    }
    try {
        const docRef = db.collection("issuers").doc(issuerName);
        const doc = await docRef.get();
        if (!doc.exists) {
            return res.status(404).json({ message: "Issuer not found." });
        }
        res.status(200).json({ documents: doc.data().documents || [] });
    } catch (error) {
        console.error(`Error fetching documents for ${issuerName}:`, error);
        res.status(500).send("Failed to fetch documents.");
    }
});

const mainApp = express();
mainApp.use('/', apiRouter); // Corrected route registration

// --- Cloud Function Exports ---

// HTTP API Function
exports.api = functions
  .region('us-central1')
  .runWith({ timeoutSeconds: 120, memory: '256MB' })
  .https.onRequest(mainApp);

// Background Scraping Function
exports.scrapeAndStoreTask = functions
  .region('us-central1')
  .runWith({ timeoutSeconds: 540, memory: '1GB' })
  .pubsub.topic('run-scraping')
  .onPublish(async (message) => {
    console.log("Scraping task triggered...");
    try {
      const issuers = await scrapeIssuers();
      console.log(`Found ${issuers.length} issuers.`);
      const batch = db.batch();
      for (const issuer of issuers) {
        try {
          const [bolsanicDocs, siboifFacts] = await Promise.all([
            scrapeBolsanicDocuments(issuer.detailUrl),
            scrapeSiboifFacts(issuer.name),
          ]);
          const isFinancial = ["banco", "financiera", "fondo de inversion", "puesto de bolsa", "sociedad de inversion"].some(term => issuer.name.toLowerCase().includes(term));
          const finalIssuerData = {
            ...issuer,
            id: issuer.name,
            sector: isFinancial ? "Privado" : "Público",
            documents: [...bolsanicDocs, ...siboifFacts],
            lastScraped: new Date().toISOString(),
          };
          const docRef = db.collection("issuers").doc(finalIssuerData.id);
          batch.set(docRef, finalIssuerData);
        } catch (error) {
          console.error(`Failed to process issuer ${issuer.name}. Error: ${error.message}`);
          const errorData = {
            ...issuer,
            id: issuer.name,
            error: `Failed to fetch details: ${error.message}`,
            documents: [],
            lastScraped: new Date().toISOString(),
          };
          const docRef = db.collection("issuers").doc(errorData.id);
          batch.set(docRef, errorData);
        }
      }
      await batch.commit();
      console.log("Successfully scraped and stored all issuers in Firestore.");
    } catch (error) {
      console.error("Fatal error during scraping task:", error);
    }
  });