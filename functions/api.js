
const functions = require("firebase-functions");
const express = require("express");
const { scrapeIssuers } = require("./src/scrapers/getIssuers");
const { scrapeBolsanicDocuments } = require("./src/scrapers/getBolsanicDocuments");
const { scrapeSiboifFacts } = require("./src/scrapers/getSiboifFacts");

const app = express();

// Middleware to set Cache-Control headers
const setCache = (res, seconds) => {
  res.set("Cache-Control", `public, max-age=${seconds}, s-maxage=${seconds}`);
};

// API endpoint to get the list of issuers
app.get("/issuers", async (req, res) => {
  try {
    const issuers = await scrapeIssuers();
    // Let's set a longer cache for the issuers list as it changes less frequently
    setCache(res, 14400); // 4 hours
    res.json({ issuers });
  } catch (error) {
    functions.logger.error("Error in /issuers:", error);
    res.status(500).send("Error scraping issuers.");
  }
});

// API endpoint to get the documents of a specific issuer
app.get("/issuer-documents", async (req, res) => {
  const { detailUrl, issuerName } = req.query;
  if (!detailUrl || !issuerName) {
    return res.status(400).send('Missing "detailUrl" or "issuerName" query parameter.');
  }

  try {
    const [bolsanicDocs, siboifFacts] = await Promise.all([
      scrapeBolsanicDocuments(detailUrl),
      scrapeSiboifFacts(issuerName),
    ]);
    const documents = [...bolsanicDocs, ...siboifFacts];
    // Temporarily set a very short cache to force refresh for verification
    setCache(res, 1);
    res.json({ documents });
  } catch (error) {
    functions.logger.error("Error in /issuer-documents:", error);
    res.status(500).send("Error scraping documents.");
  }
});

// Main API function that wraps the Express app
const api = functions
  .runWith({ memory: "1GB", timeoutSeconds: 120 })
  .https.onRequest(app);

module.exports = { api };
