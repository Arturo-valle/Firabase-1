
const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

// --- Initialization ---
// This needs to be initialized here because this script is run standalone.
// In the Firebase runtime, this is handled by the environment.
admin.initializeApp({
  // Since we are running this script locally, we need to tell the SDK
  // where to find the project configuration. This environment variable
  // is automatically set in the Firebase/Google Cloud environment.
  credential: admin.credential.applicationDefault(),
});

const db = admin.firestore();

/**
 * Fetches all issuer data from Firestore and writes it to the webapp's JSON file.
 */
async function exportFirestoreToJson() {
  console.log("Fetching data from Firestore...");

  try {
    const issuersSnapshot = await db.collection("issuers").get();
    const issuersData = [];

    if (issuersSnapshot.empty) {
      console.log("No issuers found in Firestore.");
      return;
    }

    for (const issuerDoc of issuersSnapshot.docs) {
      const issuer = issuerDoc.data();
      const documents = [];

      const documentsSnapshot = await issuerDoc.ref.collection("documents").get();
      documentsSnapshot.forEach(doc => {
        documents.push(doc.data());
      });

      issuersData.push({
        ...issuer,
        documents: documents,
        id: issuerDoc.id,
      });
    }

    issuersData.sort((a, b) => a.name.localeCompare(b.name));

    const outputPath = path.join(__dirname, "..", "webapp", "src", "issuers.json");
    fs.writeFileSync(outputPath, JSON.stringify(issuersData, null, 2)); // Using 2 spaces for indentation

    console.log(`Successfully exported ${issuersData.length} issuers to ${outputPath}`);

  } catch (error) {
    console.error("Error exporting data from Firestore:", error);
  } finally {
    await admin.app().delete();
    console.log("Firestore connection closed.");
  }
}

exportFirestoreToJson();
