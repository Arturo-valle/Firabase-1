// Forcing a change for deployment.
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const express = require("express");
const { scrapeAndStore } = require("./src/tasks/scrapeAndStore");
const { getFirestore } = require("firebase-admin/firestore");

// --- Inicialización ---
admin.initializeApp();
const app = express();

// --- API Endpoints (Ahora leen de Firestore) ---

// Endpoint para obtener TODOS los emisores
app.get("/issuers", async (req, res) => {
  try {
    const db = getFirestore();
    const issuersSnapshot = await db.collection("issuers").orderBy("name").get();
    const issuers = issuersSnapshot.docs.map(doc => doc.data());
    
    res.set("Cache-Control", "public, max-age=3600, s-maxage=3600"); // Cache de 1 hora
    res.json({ issuers });

  } catch (error) {
    functions.logger.error("Error fetching issuers from Firestore:", error);
    res.status(500).send("Error reading from database.");
  }
});

// Endpoint para obtener los documentos de UN emisor
app.get("/issuer-documents", async (req, res) => {
  const { issuerName } = req.query;
  if (!issuerName) {
    return res.status(400).send('Missing "issuerName" query parameter.');
  }

  try {
    const db = getFirestore();
    const documentsSnapshot = await db.collection("issuers").doc(issuerName).collection("documents").get();
    const documents = documentsSnapshot.docs.map(doc => doc.data());

    res.set("Cache-control", "public, max-age=300, s-maxage=300"); // Cache de 5 minutos
    res.json({ documents });

  } catch (error) {
    functions.logger.error(`Error fetching documents for ${issuerName}:`, error);
    res.status(500).send("Error reading documents from database.");
  }
});

// --- Funciones de Tareas (Ejecutan los Scrapers) ---

/**
 * Esta es nuestra función "trabajadora". 
 * Puede ser ejecutada manualmente o programada para correr periódicamente.
 * Su única misión es ejecutar los scrapers y guardar los datos en Firestore.
 */
const scrapeAndStoreTask = functions
  .runWith({ memory: "1GB", timeoutSeconds: 540 })
  .pubsub.topic('run-scraping') // Podemos invocarla publicando en este "tema"
  .onPublish(async (message) => {
    functions.logger.info("Starting scrapeAndStore task...");
    try {
      const result = await scrapeAndStore();
      functions.logger.info("scrapeAndStore task finished successfully.", result);
    } catch (error) {
      functions.logger.error("Error executing scrapeAndStore task:", error);
    }
  });

// --- Exportaciones ---

// Exportamos la API para que el frontend pueda consultarla
exports.api = functions.https.onRequest(app);

// Exportamos la tarea para poder ejecutarla
exports.scrapeAndStoreTask = scrapeAndStoreTask;
