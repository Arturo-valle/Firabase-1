const functions = require("firebase-functions");
const express = require("express");
const cors = require("cors");
const { scrapeIssuers } = require("./scrapers/getIssuers");
const { scrapeBolsanicDocuments } = require("./scrapers/getBolsanicDocuments");
const { scrapeSiboifFacts } = require("./scrapers/getSiboifFacts");

const app = express();
app.use(cors({ origin: true }));

// Middleware to log requests
app.use((req, res, next) => {
  console.log(`Request received: ${req.method} ${req.url}`);
  next();
});

// Route to get the list of all issuers
app.get("/getIssuers", async (req, res) => {
  try {
    const issuers = await scrapeIssuers();
    // Logic to determine sector based on name
    const issuersWithSectors = issuers.map(issuer => ({
      ...issuer,
      sector: issuer.name.toLowerCase().includes("banco") || issuer.name.toLowerCase().includes("financiera") ? "Privado" : "Público"
    }));
    res.status(200).json({ issuers: issuersWithSectors });
  } catch (error) {
    console.error("Error in /getIssuers:", error);
    res.status(500).send("Failed to get issuers.");
  }
});

// Route to get documents for a single issuer
app.get("/getIssuerDocuments", async (req, res) => {
  const { issuerName, detailUrl } = req.query;
  if (!issuerName || !detailUrl) {
    return res.status(400).send("Missing issuerName or detailUrl query parameter.");
  }
  try {
    const bolsanicDocs = await scrapeBolsanicDocuments(detailUrl);
    const siboifFacts = await scrapeSiboifFacts(issuerName);
    res.status(200).json({ documents: [...bolsanicDocs, ...siboifFacts] });
  } catch (error) {
    console.error(`Error in /getIssuerDocuments for ${issuerName}:`, error);
    res.status(500).send("Failed to get documents for the specified issuer.");
  }
});

exports.api = functions.https.onRequest(app);