const admin = require('firebase-admin');

// --- SETUP ---
process.env.GCLOUD_PROJECT = 'mvp-nic-market';
if (!admin.apps.length) {
    admin.initializeApp({
        projectId: "mvp-nic-market"
    });
}
const db = admin.firestore();

async function check() {
    console.log(`[${new Date().toLocaleTimeString()}] Checking history...`);
    const historySnap = await db.collection('issuerMetrics').doc('agricorp').collection('history').get();

    if (historySnap.empty) {
        console.log("   ❌ Empty history.");
    } else {
        const years = historySnap.docs.map(d => d.id).sort();
        console.log(`   ✅ Found ${historySnap.size} years: ${years.join(', ')}`);

        historySnap.docs.forEach(d => {
            const data = d.data();
            console.log(`      ${d.id} -> Activos: ${data.activosTotales}, Utilidad: ${data.utilidadNeta}`);
        });
    }
}

setInterval(check, 10000);
check();
