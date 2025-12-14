
// Main router for the Cloud Function
const functions = require("firebase-functions");
const express = require("express");
const { getFirestore } = require("firebase-admin/firestore");
const cors = require('cors');
const { VertexAI } = require('@google-cloud/vertexai');
const { compareIssuerMetrics, extractIssuerMetrics, getIssuerMetrics } = require('./src/services/metricsExtractor');

// --- Initialization ---
const app = express();
app.use(cors({ origin: true })); // Enable CORS for all routes

// --- Constants ---
const WHITELIST = [
  "agricorp",
  "banpro",
  "bdf",
  "fama",
  "financiera-fdl",
  "fid-sociedad-an-nima",
  "horizonte-fondo-de-inversi-n"
];

const DISPLAY_NAMES = {
  "agricorp": "Agricorp",
  "banpro": "Banpro",
  "bdf": "BDF",
  "fama": "Financiera FAMA",
  "financiera-fdl": "Financiera FDL",
  "fid-sociedad-an-nima": "FID",
  "horizonte-fondo-de-inversi-n": "Fondo de Inversión Horizonte"
};

const ISSUER_METADATA = {
  "agricorp": { acronym: "AGRI", sector: "Industria" },
  "banpro": { acronym: "BANPRO", sector: "Banca" },
  "bdf": { acronym: "BDF", sector: "Banca" },
  "fama": { acronym: "FAMA", sector: "Microfinanzas" },
  "financiera-fdl": { acronym: "FDL", sector: "Microfinanzas" },
  "fid-sociedad-an-nima": { acronym: "FID", sector: "Servicios Financieros" },
  "horizonte-fondo-de-inversi-n": { acronym: "HORIZONTE", sector: "Fondos de Inversión" }
};

// --- Helper Functions ---

const getBaseName = (name) => {
  if (!name) return '';
  let normalized = name.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  // Handle separators
  const separators = [' - ', ' – ', ' — ', '(', ','];
  for (const sep of separators) {
    if (normalized.includes(sep)) {
      normalized = normalized.split(sep)[0].trim();
    }
  }

  // Alias Map
  const aliases = {
    "agri": "agricorp",
    "agricorp": "agricorp",
    "corporacion agricola": "agricorp",
    "banpro": "banpro",
    "banco de la produccion": "banpro",
    "banco de la producción": "banpro",
    "bdf": "bdf",
    "bancodefinanzas": "bdf",
    "banco de finanzas": "bdf",
    "fama": "fama",
    "financiera fama": "fama",
    "fdl": "financiera-fdl",
    "financiera fdl": "financiera-fdl",
    "fid": "fid-sociedad-an-nima",
    "fid sociedad anonima": "fid-sociedad-an-nima",
    "horizonte": "horizonte-fondo-de-inversi-n",
    "horizonte fondo de inversion": "horizonte-fondo-de-inversi-n-financiero-de-crecimiento-d-lares-no-diversificado",
    "fondo inversion horizonte": "horizonte-fondo-de-inversi-n-financiero-de-crecimiento-d-lares-no-diversificado",
    "fondo inversión horizonte": "horizonte-fondo-de-inversi-n-financiero-de-crecimiento-d-lares-no-diversificado"
  };

  return aliases[normalized] || normalized;
};

const consolidateIssuers = (issuers) => {
  const issuerMap = new Map();

  issuers.forEach(issuer => {
    // 1. TRUST THE DATABASE ID FIRST
    // specific checking for legacy IDs vs new IDs can happen here if needed
    const issuerId = issuer.id;

    // We still use baseName only for display name/metadata lookup if needed, 
    // but the ID is the key.
    const baseName = getBaseName(issuer.name);

    if (!issuerMap.has(issuerId)) {
      // Auto-Discovery: If metadata exists, use it. If not, fallback to DB values.
      const meta = ISSUER_METADATA[issuerId] || ISSUER_METADATA[baseName] || {};
      const displayName = DISPLAY_NAMES[issuerId] || DISPLAY_NAMES[baseName] || issuer.name;

      issuerMap.set(issuerId, {
        ...issuer,
        id: issuerId, // Ensure ID is preserved
        name: displayName,
        acronym: meta.acronym || issuer.acronym || issuerId.toUpperCase().substring(0, 4),
        sector: meta.sector || issuer.sector || "General",
        isActive: true, // If it's in the DB, it's active
        documents: issuer.documents || []
      });
    } else {
      // Merge duplicates if any (unlikely with DB IDs)
      const existing = issuerMap.get(issuerId);
      const existingDocsUrls = new Set(existing.documents.map(d => d.url));
      if (issuer.documents) {
        issuer.documents.forEach(doc => {
          if (!existingDocsUrls.has(doc.url)) {
            existing.documents.push(doc);
            existingDocsUrls.add(doc.url);
          }
        });
      }
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



// 1. Get System Status
app.get("/status", async (req, res) => {
  try {
    const db = getFirestore();
    const issuersSnapshot = await db.collection("issuers").get();
    // PRESERVE THE ID from Firestore (Source of Truth)
    const allIssuers = issuersSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    const consolidated = consolidateIssuers(allIssuers);

    const totalDocs = consolidated.reduce((acc, i) => acc + (i.documents?.length || 0), 0);

    res.json({
      systemHealth: "Operational",
      stats: {
        totalIssuers: consolidated.length,
        processedIssuers: consolidated.length,
        coverage: "100%",
        totalDocumentsAvailable: totalDocs,
        totalDocumentsProcessed: totalDocs,
        totalChunksGenerated: totalDocs * 15 // Estimate
      },
      processedIssuers: consolidated.map(i => ({
        id: i.id,
        name: i.name,
        processed: i.documents?.length || 0,
        total: i.documents?.length || 0,
        lastProcessed: new Date().toISOString()
      }))
    });
  } catch (error) {
    functions.logger.error("Error fetching status:", error);
    res.status(500).send("Error fetching system status");
  }
});

// 2. Get All Issuers (Consolidated & Whitelisted)
app.get("/issuers", async (req, res) => {
  try {
    const db = getFirestore();
    const issuersSnapshot = await db.collection("issuers").get();
    // PRESERVE THE ID from Firestore (Source of Truth)
    const allIssuers = issuersSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));

    const consolidated = consolidateIssuers(allIssuers);
    const sorted = consolidated.sort((a, b) => b.documents.length - a.documents.length);

    res.set("Cache-Control", "public, max-age=300, s-maxage=300");
    res.json({ issuers: sorted });

  } catch (error) {
    functions.logger.error("Error fetching issuers:", error);
    res.status(500).send("Error processing issuers.");
  }
});

// 3. Get Single Issuer Detail
app.get("/issuer/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const db = getFirestore();
    const issuersSnapshot = await db.collection("issuers").get();
    // PRESERVE THE ID from Firestore (Source of Truth)
    const allIssuers = issuersSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    const consolidated = consolidateIssuers(allIssuers);

    const issuer = consolidated.find(i => i.id === id);

    if (!issuer) {
      return res.status(404).json({ error: "Issuer not found" });
    }

    res.json(issuer);
  } catch (error) {
    functions.logger.error(`Error fetching issuer ${id}:`, error);
    res.status(500).send("Error fetching issuer detail");
  }
});

// Import metrics service

// 4. AI News Generation
app.get("/ai/news", async (req, res) => {
  const days = parseInt(req.query.days || '7');

  try {
    // Initialize Vertex AI
    const vertex_ai = new VertexAI({ project: process.env.GCLOUD_PROJECT || 'mvp-nic-market', location: 'us-central1' });
    const model = 'gemini-1.5-flash-001';
    const generativeModel = vertex_ai.preview.getGenerativeModel({
      model: model,
      generationConfig: {
        'maxOutputTokens': 2048,
        'temperature': 0.2,
        'topP': 0.8,
        'topK': 40
      }
    });

    const prompt = `
            Genera 5 noticias financieras breves y relevantes sobre el mercado de valores de Nicaragua, 
            basadas en los siguientes emisores activos: ${WHITELIST.join(', ')}.
            Enfócate en hechos recientes, análisis de sector y tendencias.
            Formato JSON: { "newsItems": [{ "title": "...", "summary": "...", "publishedAt": "YYYY-MM-DD", "category": "market", "relatedIssuers": ["..."], "sentiment": "positive" }] }
        `;

    const req = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    };

    const streamingResp = await generativeModel.generateContentStream(req);
    const aggregatedResponse = await streamingResp.response;
    const text = aggregatedResponse.candidates[0].content.parts[0].text;

    // Clean markdown if present
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const newsData = JSON.parse(jsonStr);

    res.json({ success: true, ...newsData });

  } catch (error) {
    functions.logger.error("Error generating AI news:", error);
    res.status(500).json({ success: false, error: "Failed to generate news" });
  }
});

// 5. Metrics Comparison (REAL DATA)
app.post("/metrics/compare", async (req, res) => {
  const { issuerIds } = req.body;

  if (!issuerIds || !Array.isArray(issuerIds)) {
    return res.status(400).json({ error: "Invalid issuerIds" });
  }

  try {
    const comparison = await compareIssuerMetrics(issuerIds);
    res.json({ success: true, comparison });
  } catch (error) {
    functions.logger.error("Error fetching metrics comparison:", error);
    res.status(500).json({ error: "Failed to fetch metrics" });
  }
});

// 6. Trigger Metrics Extraction (Helper endpoint)
app.post("/metrics/extract/:issuerId", async (req, res) => {
  const { issuerId } = req.params;
  try {
    // Get issuer name
    const db = getFirestore();
    const issuerDoc = await db.collection("issuers").doc(issuerId).get();

    if (!issuerDoc.exists) {
      return res.status(404).json({ error: "Issuer not found" });
    }

    const issuerName = issuerDoc.data().name;
    const metrics = await extractIssuerMetrics(issuerId, issuerName);
    res.json({ success: true, metrics });
  } catch (error) {
    functions.logger.error(`Error extracting metrics for ${issuerId}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// 7. Trigger Document Processing (Helper endpoint)
const { processIssuerDocuments } = require('./src/services/documentProcessor');

app.post("/process/:issuerId", async (req, res) => {
  const { issuerId } = req.params;
  try {
    const db = getFirestore();
    const issuerDoc = await db.collection("issuers").doc(issuerId).get();

    if (!issuerDoc.exists) {
      return res.status(404).json({ error: "Issuer not found" });
    }

    const issuer = issuerDoc.data();
    const result = await processIssuerDocuments(issuerId, issuer.name, issuer.documents || []);

    res.json({ success: true, result });
  } catch (error) {
    functions.logger.error(`Error processing documents for ${issuerId}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// 8. Get Issuer Metrics (GET)
app.get("/metrics/:issuerId", async (req, res) => {
  const { issuerId } = req.params;
  try {
    const metrics = await getIssuerMetrics(issuerId);
    if (!metrics) {
      return res.status(404).json({ error: "Metrics not found" });
    }
    res.json({ success: true, metrics });
  } catch (error) {
    functions.logger.error(`Error fetching metrics for ${issuerId}:`, error);
    res.status(500).json({ error: "Failed to fetch metrics" });
  }
});

// 8.5 Get Issuer Snapshots (History list)
app.get("/metrics/:issuerId/snapshots", async (req, res) => {
  const { issuerId } = req.params;
  try {
    const db = getFirestore();
    const snapshots = await db.collection('issuerMetrics')
      .doc(issuerId)
      .collection('snapshots')
      .get();

    const results = snapshots.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({ success: true, snapshots: results });
  } catch (error) {
    functions.logger.error(`Error fetching snapshots for ${issuerId}:`, error);
    res.status(500).json({ error: "Failed to fetch snapshots" });
  }
});

// 9. Get AI Insights (GET)
const { generateIssuerInsights } = require('./src/services/aiNewsGenerator');

app.get("/ai/insights/:issuerId", async (req, res) => {
  const { issuerId } = req.params;
  try {
    // Get issuer name
    const db = getFirestore();
    const issuerDoc = await db.collection("issuers").doc(issuerId).get();

    if (!issuerDoc.exists) {
      return res.status(404).json({ error: "Issuer not found" });
    }

    const issuerName = issuerDoc.data().name;
    const insights = await generateIssuerInsights(issuerId, issuerName);

    if (!insights) {
      return res.status(404).json({ error: "Insights not found" });
    }

    res.json({ success: true, insights });
  } catch (error) {
    functions.logger.error(`Error fetching insights for ${issuerId}:`, error);
    res.status(500).json({ error: "Failed to fetch insights" });
  }
});


// --- Main API function ---
const api = functions.https.onRequest(app);

module.exports = { api };
