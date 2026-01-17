const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

if (!process.env.GCLOUD_PROJECT) process.env.GCLOUD_PROJECT = 'mvp-nic-market';
initializeApp();
const db = getFirestore();

async function fixCurrency() {
    console.log("Fixing Agricorp currency...");
    const historyRef = db.collection('issuerMetrics').doc('agricorp').collection('history');
    const RATE = 36.6243;

    const years = ['2023', '2024'];

    for (const year of years) {
        const docRef = historyRef.doc(year);
        const doc = await docRef.get();
        if (!doc.exists) continue;

        const data = doc.data();
        let updates = {};

        // Check if value is > 1 Billion (likely NIO)
        if (data.activosTotales > 1000000000) {
            updates.activosTotales = Number((data.activosTotales / RATE).toFixed(2));
            console.log(`Updated ${year} Assets: ${data.activosTotales} -> ${updates.activosTotales} USD`);
        }

        if (data.patrimonio > 1000000000) {
            updates.patrimonio = Number((data.patrimonio / RATE).toFixed(2));
            console.log(`Updated ${year} Equity: ${data.patrimonio} -> ${updates.patrimonio} USD`);
        }

        if (Object.keys(updates).length > 0) {
            await docRef.update(updates);
        }
    }
    console.log("Done.");
}

fixCurrency();
