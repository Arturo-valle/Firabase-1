const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();

const ISSUERS = [
    'agricorp', 'banpro', 'bdf', 'fama', 'fdl', 'fid', 'horizonte'
];

async function propagateHistory(issuerId) {
    console.log(`\nProcessing ${issuerId}...`);
    const historyRef = db.collection('issuerMetrics').doc(issuerId).collection('history');
    const rootRef = db.collection('issuerMetrics').doc(issuerId);

    // Get all history
    const snap = await historyRef.get();
    if (snap.empty) {
        console.log(`  No history found.`);
        return;
    }

    let latestYear = 0;
    let latestData = null;

    snap.forEach(doc => {
        const data = doc.data();
        const year = parseInt(data.period);

        // Check for valid data (using strict > 0 to avoid zero-value years like empty 2025)
        if (!isNaN(year) && data.activosTotales && Number(data.activosTotales) > 0) {
            if (year > latestYear) {
                latestYear = year;
                latestData = data;
            }
        }
        // Handle "Dic-23" formats if present? 
        // My inspection showed "2024", "2023" as periods.
    });

    if (latestData) {
        console.log(`  Found latest valid data from year ${latestYear}:`);
        console.log(`    Activos: ${latestData.activosTotales}`);
        console.log(`    Utilidad: ${latestData.utilidadNeta}`);

        // Calculate ROE if possible
        let roe = 0;
        if (latestData.utilidadNeta && latestData.patrimonio && latestData.patrimonio !== 0) {
            roe = (latestData.utilidadNeta / latestData.patrimonio) * 100;
        }

        await rootRef.set({
            capital: {
                activosTotales: latestData.activosTotales,
                patrimonio: latestData.patrimonio || 0
            },
            rentabilidad: {
                utilidadNeta: latestData.utilidadNeta,
                roe: parseFloat(roe.toFixed(2))
            },
            lastCalculatedPeriod: String(latestYear),
            lastUpdated: new Date()
        }, { merge: true });

        console.log(`  -> Validated and corrected root document.`);
    } else {
        console.log(`  No valid historical data (>0) found to propagate.`);
    }
}

async function main() {
    console.log('--- Propagating History to Root ---');
    for (const id of ISSUERS) {
        await propagateHistory(id);
    }
    console.log('\n--- Done ---');
}

main().catch(console.error);
