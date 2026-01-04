const admin = require('firebase-admin');
const serviceAccount = require('../../serviceAccountKey.json'); // User needs to ensure this exists or use default creds if implicit

// Initialize app (check if already initialized to avoid errors)
if (!admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    } catch (e) {
        console.log("Service account not found, trying default credentials...");
        admin.initializeApp();
    }
}

const db = admin.firestore();

async function listChunkIssuers() {
    console.log("Scanning documentChunks for unique issuerIds...");
    const snapshot = await db.collection('documentChunks')
        .select('issuerId') // Only select the field we need
        .get();

    const issuerIds = new Set();
    snapshot.forEach(doc => {
        const data = doc.data();
        if (data.issuerId) issuerIds.add(data.issuerId);
    });

    console.log("\n### FOUND IDs IN 'documentChunks' COLLECTION ###");
    [...issuerIds].sort().forEach(id => console.log(`- ${id}`));
}

listChunkIssuers().catch(console.error);
