const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'mvp-nic-market' });
const db = admin.firestore();

async function inspectBDFJuly2025() {
    const chunks = await db.collection('documentChunks')
        .where('issuerId', '==', 'bdf')
        .where('metadata.documentTitle', '==', 'Informe de Calificación de Riesgo a Julio 2025-Moody´s')
        .get();

    console.log(`Analyzing ${chunks.size} chunks for July 2025 Report...`);
    chunks.docs.forEach((doc, i) => {
        const t = doc.data().text;
        // Search for numbers like Millions (digits with commas)
        // BDF Assets ~700-800M USD ~ 20B NIO. So look for "20," or "21," or "22," etc.
        if (t.match(/\d{1,3}[,.]\d{3}[,.]\d{3}/)) {
            console.log(`\n--- Chunk ${i} (Has Numbers) ---`);
            console.log(t.substring(0, 300));
        }
    });
}
inspectBDFJuly2025();
