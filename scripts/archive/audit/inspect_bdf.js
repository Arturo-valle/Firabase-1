const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'mvp-nic-market' });
const db = admin.firestore();

async function inspectBDF() {
    const chunks = await db.collection('documentChunks')
        .where('issuerId', '==', 'bdf')
        .orderBy('createdAt', 'desc')
        .limit(20) // Check more chunks
        .get();

    console.log("Found", chunks.size, "chunks for BDF");
    chunks.docs.forEach((doc, i) => {
        const d = doc.data();
        if (d.text.includes('Activos') || d.text.includes('Millones') || d.text.includes('C$')) {
            console.log(`\n--- Chunk ${i} [${d.metadata?.docType}] ---`);
            console.log(d.text.substring(0, 500));
            // Look for specific numbers
            const match = d.text.match(/Activos.*?(\d[\d,\.]*)/i);
            if (match) console.log(">> POTENTIAL MATCH:", match[0]);
        }
    });
}
inspectBDF();
