const functions = require("firebase-functions");
const express = require("express");
const cors = require("cors");
const { scrapeIssuers } = require("./scrapers/getIssuers");
const { scrapeBolsanicDocuments } = require("./scrapers/getBolsanicDocuments");
const { scrapeSiboifFacts } = require("./scrapers/getSiboifFacts");
const { scrapeBcnRates } = require("./scrapers/getBcnRates");

// --- Caching Configuration ---
const CACHE_DURATION_MS = 4 * 60 * 60 * 1000; // 4 hours
let issuersCache = {
  timestamp: null,
  data: null,
};
// --- End Caching Configuration ---

const apiRouter = express.Router();
apiRouter.use(cors({ origin: true }));

apiRouter.get("/bcn", async (req, res) => {
  try {
    console.log("Fetching BCN rates...");
    const rates = await scrapeBcnRates();
    console.log("Successfully fetched BCN rates.");
    res.status(200).json(rates);
  } catch (error) {
    console.error("Error fetching BCN rates:", error);
    res.status(500).send("Failed to fetch BCN exchange rates.");
  }
});

apiRouter.get("/issuers", async (req, res) => {
  const now = Date.now();

  // --- Cache Check ---
  if (issuersCache.timestamp && (now - issuersCache.timestamp < CACHE_DURATION_MS)) {
    console.log("Serving from cache.");
    return res.status(200).json(issuersCache.data);
  }
  // --- End Cache Check ---

  try {
    console.log("Fetching issuers (cache stale or empty)...");
    const issuers = await scrapeIssuers();
    console.log(`Found ${issuers.length} issuers.`);

    const detailedIssuers = [];

    for (const issuer of issuers) {
      try {
        console.log(`Fetching details for ${issuer.name}...`);
        
        const [bolsanicDocs, siboifFacts] = await Promise.all([
          scrapeBolsanicDocuments(issuer.detailUrl),
          scrapeSiboifFacts(issuer.name),
        ]);

        const isFinancial = [
          "banco",
          "financiera",
          "fondo de inversion",
          "puesto de bolsa",
          "sociedad de inversion"
        ].some(term => issuer.name.toLowerCase().includes(term));

        detailedIssuers.push({
          ...issuer,
          sector: isFinancial ? "Privado" : "Público",
          documents: [...bolsanicDocs, ...siboifFacts],
        });

      } catch (error) {
        console.error(`Failed to process issuer ${issuer.name}. Error: ${error.message}`);
        detailedIssuers.push({
          ...issuer,
          error: `Failed to fetch details: ${error.message}`,
          documents: [],
        });
      }
    }
    
    // --- Update Cache ---
    console.log("Successfully processed all issuers. Updating cache.");
    issuersCache = {
      timestamp: Date.now(),
      data: detailedIssuers,
    };
    // --- End Update Cache ---

    res.status(200).json(detailedIssuers);

  } catch (error) {
    console.error("Fatal error fetching the initial issuer list:", error);
    res.status(500).send("Failed to fetch the main issuer list.");
  }
});

const mainApp = express();
mainApp.use('/api', apiRouter);

exports.api = functions
  .runWith({ timeoutSeconds: 540 })
  .https.onRequest(mainApp);
