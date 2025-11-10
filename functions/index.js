
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { scrapeAndStore } = require("./src/tasks/scrapeAndStore");
const { api } = require("./api"); // Import the Express app from api.js

// --- Initialization ---
admin.initializeApp();

// --- Background Tasks ---
const scrapeAndStoreTask = functions
  .runWith({ memory: "1GB", timeoutSeconds: 540 })
  .pubsub.topic('run-scraping')
  .onPublish(async (message) => {
    functions.logger.info("Starting scrapeAndStore task...");
    try {
      await scrapeAndStore();
      functions.logger.info("scrapeAndStore task finished successfully.");
    } catch (error) {
      functions.logger.error("Error executing scrapeAndStore task:", error);
    }
  });

// --- Exports ---
// Re-export the imported API and the background task
exports.api = api;
exports.scrapeAndStoreTask = scrapeAndStoreTask;
