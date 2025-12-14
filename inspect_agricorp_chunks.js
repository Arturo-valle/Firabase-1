const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'mvp-nic-market' });
const db = admin.firestore();

async function inspectChunks() {
    console.log("--- Inspecting Agricorp Chunks ---");
    // ID Mapped manually based on previous findings
    const sourceId = "corporaci-n-agricola";

    const snap = await db.collection('documentChunks')
        .where('issuerId', '==', sourceId)
        .limit(10)
        .get();

    if (snap.empty) {
        console.log("No chunks found!");
        return;
    }

    snap.docs.forEach((d, i) => {
        const data = d.data();
        console.log(`\n[Chunk ${i}] Date: ${data.metadata.date}, Title: ${data.metadata.title}`);
        console.log(`Text Preview: ${data.text.substring(0, 300)}...`);
    });
}
inspectChunks();
