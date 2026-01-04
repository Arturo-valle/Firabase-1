const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'mvp-nic-market' });
const db = admin.firestore();

async function listChunkIssuers() {
    console.log("--- Scanning Document Chunks for Issuer IDs ---");
    // This is expensive, so limit it.
    const chunks = await db.collection('documentChunks')
        .limit(1000)
        .get();

    const issuers = new Set();
    chunks.docs.forEach(d => issuers.add(d.data().issuerId));
    console.log("Found Issuer IDs in Chunks:", Array.from(issuers));
}
listChunkIssuers();
