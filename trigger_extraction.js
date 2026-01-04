const admin = require('firebase-admin');
const { extractHistoricalMetrics } = require('./functions/src/services/metricsExtractor');

if (admin.apps.length === 0) {
    admin.initializeApp({ projectId: 'mvp-nic-market' });
}

async function run() {
    const issuerId = process.argv[2] || 'bdf';
    console.log(`Triggering extraction for: ${issuerId}`);
    try {
        const result = await extractHistoricalMetrics(issuerId);
        console.log('Extraction Result:', JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('Error triggering extraction:', error);
    }
}

run();
