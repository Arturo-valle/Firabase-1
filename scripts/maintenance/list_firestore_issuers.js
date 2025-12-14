const admin = require('firebase-admin');

// Handle credentials automatically
let serviceAccount;
try {
    serviceAccount = require('./functions/serviceAccountKey.json');
} catch (e) {
    // Fallback
}

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: 'mvp-nic-market'
    });
}

const db = admin.firestore();

async function listIssuers() {
    console.log("Listing Firestore Issuer IDs...");
    const snapshot = await db.collection('issuers').get();

    snapshot.docs.forEach(doc => {
        console.log(`ID: "${doc.id}" | Name: "${doc.data().name}" | Docs: ${doc.data().documents?.length || 0}`);
    });
}

listIssuers().catch(console.error);
