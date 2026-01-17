const admin = require('firebase-admin');

if (!admin.apps.length) {
    admin.initializeApp({
        projectId: "mvp-nic-market"
    });
}

const db = admin.firestore();

const ISSUERS = ['agricorp', 'banpro', 'bdf', 'fama', 'financiera_fdl', 'credomatic'];

async function check() {
    console.log("--- Global History Audit ---");
    for (const id of ISSUERS) {
        console.log(`\nChecking ${id}...`);
        const snap = await db.collection('issuerMetrics').doc(id).collection('history').orderBy('period', 'desc').get();
        if (snap.empty) {
            console.log(`❌ No history found.`);
            continue;
        }
        snap.forEach(doc => {
            const d = doc.data();
            console.log(`  ${doc.id}: Assets=${d.activosTotales ? (d.activosTotales / 1000000).toFixed(2) + 'M' : 'NULL'}, NetInc=${d.utilidadNeta ? (d.utilidadNeta / 1000000).toFixed(2) + 'M' : 'NULL'} (${d.moneda || 'No Currency Tag'})`);
        });
    }
}

check().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
