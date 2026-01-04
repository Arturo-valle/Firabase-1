const { onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");

// Initialize Firebase Admin SDK
admin.initializeApp();

// Import App
const app = require("./app");

// Import Scheduled Tasks
const { syncIssuers } = require("./tasks/syncIssuers");
const { indexFacts } = require("./tasks/indexFacts");
const { onDocumentUpload } = require("./triggers/storage");
const { backfillHistory } = require("./tasks/backfillHistory");
const { diagnoseVertex } = require("./tasks/diagnoseVertex");

/**
 * Main API Entry Point
 * Handles all REST API requests via Express app
 */
exports.api = onRequest({
  region: "us-central1",
  timeoutSeconds: 540,
  memory: "2GiB",
  concurrency: 4,
}, app);

/**
 * Storage Trigger: onDocumentUpload
 * Triggered when a file is uploaded to the 'issuer-docs' bucket.
 * Extracts text and generates embeddings.
 */
exports.onDocumentUpload = onDocumentUpload;

/**
 * Scheduled Task: syncIssuersTask
 * Runs every 24 hours.
 * Scrapes Bolsanic.com for new issuers and updates the database.
 */
exports.syncIssuersTask = onSchedule({
  schedule: "every 24 hours",
  region: "us-central1",
  timeoutSeconds: 540,
  memory: "2GB",
}, async (event) => {
  await syncIssuers();
});

/**
 * Scheduled Task: indexFactsTask
 * Runs every 24 hours.
 * Scrapes and indexes "Hechos Relevantes" from issuers.
 */
exports.indexFactsTask = onSchedule({
  schedule: "every 24 hours",
  region: "us-central1",
  timeoutSeconds: 300,
  memory: "1GB",
}, async (event) => {
  await indexFacts();
});

/**
 * Manual Task: backfillHistoryTask
 * Manually triggered via HTTP request.
 * Backfills historical data for issuers.
 */
exports.backfillHistoryTask = onRequest({
  region: "us-central1",
  timeoutSeconds: 540,
  memory: "4GiB",
}, backfillHistory);

/**
 * Scheduled Task: indexFinancialsTask
 * Runs every 24 hours.
 * Indexes financial data. Uses dynamic import to reduce cold start time.
 */
exports.indexFinancialsTask = onSchedule({
  schedule: "every 24 hours",
  region: "us-central1",
  timeoutSeconds: 540,
  memory: "4GiB",
}, async (event) => {
  // Import dynamically to keep cold start fast
  const indexFinancialsModule = require("./tasks/indexFinancials");
  await indexFinancialsModule(null, null);
});

/**
 * Manual Task: manualIndexFinancialsTask
 * Manually triggered via HTTP request.
 */
exports.manualIndexFinancialsTask = onRequest({
  region: "us-central1",
  timeoutSeconds: 540,
  memory: "4GiB",
}, async (req, res) => {
  const indexFinancialsModule = require("./tasks/indexFinancials");
  await indexFinancialsModule(req, res);
});

/**
 * Manual Task: regenerateMetricsTask
 * Manually triggered via HTTP request.
 * Regenerates calculated metrics for issuers.
 */
exports.regenerateMetricsTask = onRequest({
  region: "us-central1",
  timeoutSeconds: 540,
  memory: "4GiB",
}, require("./tasks/regenerateMetrics"));

/**
 * Debug Task: manualSyncTask
 * Manually triggers a full issuer sync.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
exports.manualSyncTask = onRequest({
  region: "us-central1",
  timeoutSeconds: 540,
  memory: "2GB", // Higher memory for full sync
}, async (req, res) => {
  try {
    await syncIssuers();
    res.status(200).send("Manual Sync Completed Successfully");
  } catch (error) {
    console.error("Manual Sync Failed:", error);
    res.status(500).send(`Sync Failed: ${error.message}`);
  }
});

/**
 * Manual Task: cleanupIssuersTask
 * Removes issuers from Firestore that are not in the official whitelist.
 */
exports.cleanupIssuersTask = onRequest({
  region: "us-central1",
  timeoutSeconds: 300,
  memory: "1GB",
}, require("./tasks/cleanupIssuers"));

/**
 * Diagnostic Task: diagnoseVertexTask
 * Verifies connectivity to Vertex AI and specific model accessibility.
 */
exports.diagnoseVertexTask = onRequest({
  region: "us-central1",
  timeoutSeconds: 60,
  memory: "512MiB",
}, diagnoseVertex);

exports.listModelsTask = onRequest({
  region: "us-central1",
  timeoutSeconds: 60,
  memory: "512MiB",
}, require("./tasks/listModels"));



