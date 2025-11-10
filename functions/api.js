
// Main router for the Cloud Function
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const express = require("express");
const { getFirestore } = require("firebase-admin/firestore");
const { scrapeAndStore } = require("./src/tasks/scrapeAndStore");

// --- Initialization ---
// admin.initializeApp() is called in index.js, no need to repeat here.
const app = express();

// --- LOGGING MIDDLEWARE ---
app.use((req, res, next) => {
  functions.logger.info(`Request received: ${req.method} ${req.originalUrl}`);
  next();
});

// --- API Endpoints ---

// Endpoint to get ALL issuers from Firestore
app.get("/issuers", async (req, res) => {
  try {
    const db = getFirestore();
    const issuersSnapshot = await db.collection("issuers").orderBy("name").get();
    const issuers = issuersSnapshot.docs.map(doc => doc.data());
    
    res.set("Cache-Control", "public, max-age=3600, s-maxage=3600"); // 1-hour cache
    res.json({ issuers });

  } catch (error) {
    functions.logger.error("Error fetching issuers from Firestore:", error);
    res.status(500).send("Error reading from database.");
  }
});

// Endpoint to get documents for ONE issuer from Firestore
app.get("/issuer-documents", async (req, res) => {
  const { issuerName } = req.query;
  if (!issuerName) {
    return res.status(400).send('Missing "issuerName" query parameter.');
  }

  try {
    const db = getFirestore();
    // Get the subcollection of documents for the given issuer
    const documentsSnapshot = await db.collection("issuers").doc(issuerName).collection("documents").get();
    const documents = documentsSnapshot.docs.map(doc => doc.data());

    res.set("Cache-Control", "public, max-age=300, s-maxage=300"); // 5-minute cache
    res.json({ documents });

  } catch (error) {
    functions.logger.error(`Error fetching documents for ${issuerName}:`, error);
    res.status(500).send("Error reading documents from database.");
  }
});

// --- Main API function ---
const api = functions.https.onRequest(app);

module.exports = { api };
