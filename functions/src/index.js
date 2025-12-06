const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { getFirestore } = require("firebase-admin/firestore");

// Initialize Firebase Admin SDK
admin.initializeApp();

// Import App
const app = require("./app");

// Import Scheduled Tasks
const { syncIssuers } = require("./tasks/syncIssuers");
const { indexFacts } = require("./tasks/indexFacts");
const { onDocumentUpload } = require("./triggers/storage");
const { backfillHistory } = require("./tasks/backfillHistory");

// Export API
exports.api = functions
  .region('us-central1')
  .runWith({ timeoutSeconds: 120, memory: '256MB' })
  .https.onRequest(app);

// Export Triggers
exports.onDocumentUpload = onDocumentUpload;

// Export Scheduled Tasks
exports.syncIssuersTask = functions
  .region('us-central1')
  .runWith({ timeoutSeconds: 540, memory: '2GB' })
  .pubsub.schedule('every 24 hours')
  .onRun(async (context) => {
    await syncIssuers();
  });

exports.indexFactsTask = functions
  .region('us-central1')
  .runWith({ timeoutSeconds: 300, memory: '1GB' })
  .pubsub.schedule('every 24 hours')
  .onRun(async (context) => {
    await indexFacts();
  });

// Manual Backfill Task (HTTP)
exports.backfillHistoryTask = functions
  .region('us-central1')
  .runWith({ timeoutSeconds: 540, memory: '2GB' })
  .https.onRequest(backfillHistory);
