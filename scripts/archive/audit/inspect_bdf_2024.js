const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'mvp-nic-market' });
const db = admin.firestore();

async function inspectBDFDec2024() {
    const chunks = await db.collection('documentChunks')
        .where('issuerId', '==', 'bdf')
        .where('metadata.documentTitle', '==', 'Informe de Calificación de Riesgo a Diciembre 2024 – Moody´s')
        .get();

    console.log(`Analyzing ${chunks.size} chunks for Dec 2024 Report...`);
    let found = false;
    chunks.docs.forEach((doc, i) => {
        const t = doc.data().text;
        // Look for Activos Totales + Number
        if (t.match(/Activos.*?(\d[\d,\.]*)/i) || t.match(/Total de Activos.*?(\d[\d,\.]*)/i)) {
            console.log(`\n--- Chunk ${i} (Potential Hit) ---`);
            console.log(t.substring(0, 300));
            found = true;
        }
    });
    if (!found) console.log("No obvious 'Activos Totales' table found in text.");
}
inspectBDFDec2024();
