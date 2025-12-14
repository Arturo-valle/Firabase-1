const { compareIssuerMetrics } = require('../functions/src/services/metricsExtractor');
const admin = require('firebase-admin');

// Mock Firebase Admin init if not already initialized
if (admin.apps.length === 0) {
    const serviceAccount = require('/Users/auxiliadorarizo/Desktop/Firabase - 1/Firabase-1/serviceAccountKey.json'); // Adjust path if needed or rely on default creds
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

// IDs to test (active issuers)
const TEST_IDS = ["agricorp", "banpro", "bdf", "fama", "fdl", "fid", "horizonte"];

async function runTest() {
    console.log("Starting verification of compareIssuerMetrics...");
    console.log(`Testing with IDs: ${TEST_IDS.join(', ')}`);

    try {
        const results = await compareIssuerMetrics(TEST_IDS);

        console.log("\n--- Results ---");
        console.log(`Total items returned: ${results.length}`);

        results.forEach(item => {
            const hasData = item.metrics && item.metrics.capital && item.metrics.capital.activosTotales > 0;
            const assets = item.metrics?.capital?.activosTotales;
            console.log(`[${item.issuerId}] ${item.issuerName}: Assets = ${assets ? assets.toLocaleString() : 'N/D'} (${hasData ? 'OK' : 'ZERO/MISSING'})`);
        });

        const totalAssets = results.reduce((sum, item) => sum + (item.metrics?.capital?.activosTotales || 0), 0);
        console.log(`\nTotal Market Cap (Assets): ${totalAssets.toLocaleString()}`);

        if (totalAssets === 0) {
            console.error("FAIL: Total Market Cap is ZERO. Fix not effective or data missing in DB.");
        } else {
            console.log("SUCCESS: Market Cap is > 0.");
        }

    } catch (error) {
        console.error("Test Failed with Error:", error);
    }
}

runTest();
