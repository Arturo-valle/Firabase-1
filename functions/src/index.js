const functions = require("firebase-functions");
const express = require("express");
const cors = require("cors");
const { scrapeIssuers } = require("./scrapers/getIssuers");
const { scrapeBolsanicDocuments } = require("./scrapers/getBolsanicDocuments");
const { scrapeSiboifFacts } = require("./scrapers/getSiboifFacts");
const { scrapeBcnRates } = require("./scrapers/getBcnRates");

// Create a router for our API
const apiRouter = express.Router();

// Automatically allow cross-origin requests
apiRouter.use(cors({ origin: true }));

// New endpoint for BCN exchange rates
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

// Rewritten and robust main API endpoint to get all issuer data
apiRouter.get("/issuers", async (req, res) => {
  try {
    console.log("Fetching issuers...");
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

    console.log("Successfully processed all issuers.");
    res.status(200).json(detailedIssuers);

  } catch (error) {
    console.error("Fatal error fetching the initial issuer list:", error);
    res.status(500).send("Failed to fetch the main issuer list.");
  }
});

// Create a main Express app and mount the API router under /api
const mainApp = express();
mainApp.use('/api', apiRouter);

// Expose the main Express app as a single Cloud Function
exports.api = functions
  .runWith({ timeoutSeconds: 540 })
  .https.onRequest(mainApp);
