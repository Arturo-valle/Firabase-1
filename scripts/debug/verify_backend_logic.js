const admin = require('firebase-admin');
const { extractIssuerMetrics } = require('./functions/src/services/metricsExtractor');

// Handle credentials automatically
let serviceAccount;
try {
    serviceAccount = require('./functions/serviceAccountKey.json');
} catch (e) { }

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: 'mvp-nic-market'
    });
}

// Full authoritative list of IDs we expect to work
const ISSUERS = [
    { id: 'agricorp', name: 'Agricorp' },
    { id: 'banpro', name: 'Banpro' },
    { id: 'bdf', name: 'BDF' },
    { id: 'fama', name: 'Financiera FAMA' },
    { id: 'financiera-fdl', name: 'Financiera FDL' },
    { id: 'fid-sociedad-an-nima', name: 'FID' },
    { id: 'horizonte-fondo-de-inversi-n', name: 'Horizonte' }
];

async function verifyAll() {
    console.log("🚀 STARTING RIGOROUS BACKEND VERIFICATION 🚀");
    console.log("Goal: 100% Data Availability for 7/7 Issuers");
    console.log("---------------------------------------------------");

    const results = [];

    for (const issuer of ISSUERS) {
        console.log(`\nTesting: ${issuer.name} (${issuer.id})...`);
        try {
            const metrics = await extractIssuerMetrics(issuer.id, issuer.name);

            // Validation Logic
            const hasAssets = metrics.capital?.activosTotales > 0;
            const hasIncome = metrics.rentabilidad?.utilidadNeta !== null;
            const hasEquity = metrics.capital?.patrimonio > 0;
            const isAudited = metrics.metadata?.note?.includes('auditado') || metrics.metadata?.periodo?.includes('Dic');

            const status = (hasAssets && hasEquity) ? "✅ PASS" : "❌ FAIL";

            console.log(`   > Assets: ${metrics.capital?.activosTotales}`);
            console.log(`   > Net Income: ${metrics.rentabilidad?.utilidadNeta}`);
            console.log(`   > Source: ${metrics.metadata?.fuente}`);
            console.log(`   > Status: ${status}`);

            results.push({
                name: issuer.name,
                status,
                assets: metrics.capital?.activosTotales,
                income: metrics.rentabilidad?.utilidadNeta,
                source: metrics.metadata?.fuente
            });

        } catch (error) {
            console.error(`   > ERROR: ${error.message}`);
            results.push({
                name: issuer.name,
                status: "❌ ERROR",
                error: error.message
            });
        }
    }

    console.log("\n\n📊 FINAL REPORT CARD 📊");
    console.log("---------------------------------------------------");
    console.table(results);
    console.log("---------------------------------------------------");
}

verifyAll();
