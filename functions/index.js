const functions = require("firebase-functions");
const express = require("express");
const path = require("path");
const { scrapeIssuers } = require("./src/getIssuers");
const { scrapeBolsanicDocuments } = require("./src/getBolsanicDocuments");
const { scrapeSiboifFacts } = require("./src/getSiboifFacts");

const app = express();

// Serve the static files from the React app
app.use(express.static(path.join(__dirname, "..", "webapp", "dist")));

// API endpoint to get the list of issuers
app.get("/api/getIssuers", async (req, res) => {
  functions.logger.info("Request received for getIssuers");
  try {
    const issuers = await scrapeIssuers();
    res.json({ issuers });
  } catch (error) {
    functions.logger.error("Error in getIssuers:", error);
    res.status(500).send("Error scraping issuers.");
  }
});

// API endpoint to get the documents of a specific issuer
app.get("/api/getIssuerDocuments", async (req, res) => {
  const { detailUrl, issuerName } = req.query;
  if (!detailUrl || !issuerName) {
    return res.status(400).send('Missing "detailUrl" or "issuerName" query parameter.');
  }

  functions.logger.info(`Request for docs for ${issuerName} with URL: ${detailUrl}`);
  try {
    // Scrape documents from both sources in parallel
    const [bolsanicDocs, siboifFacts] = await Promise.all([
      scrapeBolsanicDocuments(detailUrl),
      scrapeSiboifFacts(issuerName)
    ]);

    // Combine the results
    const documents = [...bolsanicDocs, ...siboifFacts];
    
    res.json({ documents });
  } catch (error) {
    functions.logger.error("Error in getIssuerDocuments:", error);
    res.status(500).send("Error scraping issuer documents.");
  }
});

// Handles any requests that don't match the ones above
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "webapp", "dist", "index.html"));
});

// Expose the Express app as a Cloud Function with specific options
exports.app = functions
  .runWith({ memory: '1GB', timeoutSeconds: 120 })
  .https.onRequest(app);
