
const admin = require('firebase-admin');

// Handle credentials
try {
    const serviceAccount = require('./functions/serviceAccountKey.json');
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    }
} catch (e) {
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.applicationDefault(),
            projectId: 'mvp-nic-market'
        });
    }
}

const db = admin.firestore();

const ISSUERS = [
    { id: 'agricorp', name: 'Agricorp' },
    { id: 'banpro', name: 'Banpro' },
    { id: 'bdf', name: 'BDF' },
    { id: 'fama', name: 'Financiera FAMA' },
    { id: 'financiera-fdl', name: 'Financiera FDL' },
    { id: 'fid-sociedad-an-nima', name: 'FID' },
    { id: 'horizonte-fondo-de-inversi-n', name: 'Horizonte' }
];

async function auditSystem() {
    console.log("🔍 STARTING DEEP VECTORIZATION AUDIT 🔍");
    console.log("----------------------------------------------------------------");
    console.log("| Issuer ID | Name | Raw Docs (Scraped) | Vector Chunks (AI Ready) | Status |");
    console.log("----------------------------------------------------------------");

    for (const issuer of ISSUERS) {
        // 1. Check Raw Documents (Scraper Output)
        const issuerDoc = await db.collection('issuers').doc(issuer.id).get();
        let rawCount = 0;
        let lastSync = 'N/A';

        if (issuerDoc.exists) {
            const data = issuerDoc.data();
            rawCount = data.documents ? data.documents.length : 0;
            lastSync = data.lastSync ? new Date(data.lastSync.toDate()).toISOString() : 'Never';
        }

        // 2. Check Vectorized Chunks (Processor Output)
        // We just count the docs in the query
        const chunksSnapshot = await db.collection('documentChunks')
            .where('issuerId', '==', issuer.id)
            .count()
            .get();

        const vectorCount = chunksSnapshot.data().count;

        // 3. Determine Status
        let status = "✅ OK";
        if (rawCount === 0) status = "❌ EMPTY (Source)";
        else if (vectorCount === 0) status = "⚠️ UNPROCESSED (Needs Vectorization)";
        else if (vectorCount < rawCount) status = "⚠️ PARTIAL"; // Rough heuristic

        // Pad strings for table formatting
        const idPad = issuer.id.padEnd(25).substring(0, 25);
        const namePad = issuer.name.padEnd(15).substring(0, 15);
        const rawPad = String(rawCount).padEnd(18);
        const vecPad = String(vectorCount).padEnd(23);

        console.log(`| ${idPad} | ${namePad} | ${rawPad} | ${vecPad} | ${status} |`);
    }
    console.log("----------------------------------------------------------------");
}

auditSystem();
