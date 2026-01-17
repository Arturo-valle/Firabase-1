const admin = require('firebase-admin');
const { extractHistoricalMetrics } = require('../functions/src/services/metricsExtractor');

if (!admin.apps.length) admin.initializeApp();

async function trigger() {
    const list = ['agricorp', 'banpro', 'bdf', 'fama', 'fdl', 'fid', 'horizonte'];
    for (const id of list) {
        console.log(`\n--- Extracting History for ${id} ---`);
        try {
            const issuerDoc = await admin.firestore().collection('issuers').doc(id).get();
            const name = issuerDoc.exists ? issuerDoc.data().name : id;
            await extractHistoricalMetrics(id, name);
            console.log(`✅ Extraction triggered for ${id}`);
        } catch (e) {
            console.error(`❌ Failed for ${id}:`, e.message);
        }
    }
}

trigger().then(() => process.exit(0));
