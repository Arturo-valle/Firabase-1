
const admin = require('firebase-admin');
const { scrapeAndStore } = require('./src/tasks/scrapeAndStore.js');

// In the Firebase environment (like Cloud Functions or a tool like Firebase Studio),
// the SDK is often initialized without arguments.
try {
  admin.initializeApp();
  console.log("Firebase Admin SDK initialized.");
} catch (e) {
  // This can happen if the app is already initialized, which is fine.
  if (e.code !== 'app/duplicate-app') {
    console.error('Firebase Admin SDK initialization error:', e);
    process.exit(1);
  }
}

console.log('Starting the scraping process...');

scrapeAndStore()
  .then(() => {
    console.log('Scraping process completed successfully!');
    // Exiting the process explicitly to terminate the script.
    process.exit(0);
  })
  .catch((error) => {
    console.error('An error occurred during the scraping process:', error);
    process.exit(1);
  });
