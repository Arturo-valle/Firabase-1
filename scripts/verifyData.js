const admin = require('firebase-admin');
if (!admin.apps.length) admin.initializeApp({ projectId: 'mvp-nic-market' });
const db = admin.firestore();

async function verify() {
    console.log("Verifying Data Fixes...");

    // Check Raw Docs
    const rawIds = [
        'horizonte-fondo-de-inversi-n-financiero-de-crecimiento-d-lares-no-diversificado', // The likely scraped ID
        'horizonte-fondo-de-inversion', // Another possibility
        'fid-sociedad-an-nima',
        'fid-s-a'
    ];

    console.log("\n--- Checking Raw Firestore Documents ---");
    for (const id of rawIds) {
        const doc = await db.collection('issuers').doc(id).get();
        if (doc.exists) {
            const data = doc.data();
            console.log(`[FOUND] issuers/${id}: ${data.documents?.length || 0} documents.`);
        } else {
            console.log(`[MISSING] issuers/${id}`);
        }
    }

    // Check Metrics (which should be populated by regenerateMetrics)
    console.log("\n--- Checking Metrics ---");
    for (const id of rawIds) {
        const doc = await db.collection('issuerMetrics').doc(id).get();
        if (doc.exists) {
            const data = doc.data();
            const assets = data.capital?.activosTotales || data.solvencia?.activoTotal || 0;
            console.log(`[FOUND] issuerMetrics/${id}: Activos=${assets}, Periodo=${data.metadata?.periodo}`);
        } else {
            console.log(`[MISSING] issuerMetrics/${id}`);
        }
    }
}
verify();
