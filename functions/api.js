
// Main router for the Cloud Function
const functions = require("firebase-functions");
const express = require("express");
const { getFirestore } = require("firebase-admin/firestore");
const cors = require('cors');

// --- Initialization ---
const app = express();
app.use(cors({ origin: true })); // Enable CORS for all routes

// --- Helper Functions for Data Consolidation ---

const getBaseName = (name) => {
  if (!name) return '';
  const normalized = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return normalized.split(',')[0].split('(')[0].split('-')[0].trim();
};

const consolidateIssuers = (issuers) => {
  const issuerMap = new Map();
  const sortedIssuers = [...issuers].sort((a, b) => b.name.length - a.name.length);

  sortedIssuers.forEach(issuer => {
    const baseName = getBaseName(issuer.name);
    if (!issuerMap.has(baseName)) {
      const newIssuer = JSON.parse(JSON.stringify(issuer));
      newIssuer.id = baseName;
      issuerMap.set(baseName, newIssuer);
    } else {
      const existing = issuerMap.get(baseName);
      const existingDocsUrls = new Set(existing.documents.map(d => d.url));
      issuer.documents.forEach(doc => {
        if (!existingDocsUrls.has(doc.url)) {
          existing.documents.push(doc);
        }
      });
    }
  });

  return Array.from(issuerMap.values());
};

// --- Logging Middleware ---
app.use((req, res, next) => {
  functions.logger.info(`Request received: ${req.method} ${req.originalUrl}`);
  next();
});

// --- API Endpoints ---

// Gets ALL issuers, consolidates them, and then returns.
app.get("/issuers", async (req, res) => {
  try {
    const db = getFirestore();
    const issuersSnapshot = await db.collection("issuers").get();
    const allIssuers = issuersSnapshot.docs.map(doc => doc.data());
    
    const consolidated = consolidateIssuers(allIssuers);
    const sorted = consolidated.sort((a, b) => a.name.localeCompare(b.name));

    res.set("Cache-Control", "public, max-age=3600, s-maxage=3600");
    res.json({ issuers: sorted });

  } catch (error) {
    functions.logger.error("Error fetching and consolidating issuers:", error);
    res.status(500).send("Error processing issuers from the database.");
  }
});

// CORRECTED Endpoint: Gets documents for ONE issuer by querying its name
app.get("/issuer-documents", async (req, res) => {
  const { issuerName } = req.query;
  if (!issuerName) {
    return res.status(400).send('Missing "issuerName" query parameter.');
  }

  try {
    const db = getFirestore();
    // Correctly query for the issuer by its name field
    const issuersRef = db.collection("issuers");
    const snapshot = await issuersRef.where("name", "==", issuerName).get();

    if (snapshot.empty) {
      functions.logger.warn(`No issuer found with name: ${issuerName}`);
      return res.status(404).json({ documents: [] }); // Return empty documents array
    }

    // Even if multiple docs match, take the first one.
    const issuerDoc = snapshot.docs[0];
    const issuerData = issuerDoc.data();
    const documents = issuerData.documents || [];

    res.set("Cache-Control", "public, max-age=300, s-maxage=300");
    res.json({ documents });

  } catch (error) {
    functions.logger.error(`Error fetching documents for ${issuerName}:`, error);
    res.status(500).send("Error reading documents from database.");
  }
});

// --- Main API function ---
const api = functions.https.onRequest(app);

module.exports = { api };
