const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'mvp-nic-market' });
const db = admin.firestore();

async function inspectBDFCurrent() {
    const chunks = await db.collection('documentChunks')
        .where('issuerId', '==', 'bdf')
        .orderBy('createdAt', 'desc')
        .limit(5)
        .get();

    chunks.docs.forEach((doc, i) => {
        const d = doc.data();
        console.log(`\n--- BDF 2025 Chunk ${i} ---`);
        console.log("Metadata:", d.metadata);
        console.log("Text Snippet:", d.text.substring(0, 500));
    });
}
inspectBDFCurrent();
