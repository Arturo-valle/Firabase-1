const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

try {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
} catch (e) {
    console.log("Service account init failed, trying default.", e.message);
    if (admin.apps.length === 0) {
        admin.initializeApp();
    }
}

const db = admin.firestore();

const issuersToCheck = ['AGRI', 'BDF', 'FAMA', 'BANPRO', 'FID', 'FDL'];

async function checkMetrics() {
    console.log('Checking metrics for:', issuersToCheck);

    for (const id of issuersToCheck) {
        // 1. Check Issuer Metrics
        const metricDoc = await db.collection('issuerMetrics').doc(id).get();
        const hasMetrics = metricDoc.exists;
        const metricsData = hasMetrics ? metricDoc.data() : null;

        console.log(`\n--- Issuer: ${id} ---`);
        console.log(`Has Metrics: ${hasMetrics}`);
        if (hasMetrics) {
            console.log(`Extracted At: ${metricsData.extractedAt ? metricsData.extractedAt.toDate() : 'N/A'}`);
            console.log(`Data keys: ${Object.keys(metricsData).join(', ')}`);
        }

        // 2. Check Document Chunks (to see if extraction is even possible)
        // We typically query where issuerId == id.
        const chunksQuery = await db.collection('documentChunks')
            .where('issuerId', '==', id)
            .count()
            .get();

        console.log(`Document Chunks Count: ${chunksQuery.data().count}`);
    }
}

checkMetrics().catch(console.error);
