const admin = require('firebase-admin');

// Initialize Firebase Admin with default credentials
admin.initializeApp();

const db = admin.firestore();

async function inspectIssuer(issuerId) {
    console.log(`\n--- Inspecting ${issuerId} ---`);

    // Check Root Doc to see if it holds specific year data directly (sometimes used for current stats)
    const rootDoc = await db.collection('issuerMetrics').doc(issuerId).get();
    if (!rootDoc.exists) {
        console.log(`[ROOT] Document does not exist!`);
    } else {
        const data = rootDoc.data();
        // Log key fields if they exist at root level
        console.log(`[ROOT] DATA Keys:`, Object.keys(data).filter(k => !k.startsWith('_')));
        console.log(`[ROOT] 2024 snippet:`, data['2024'] ? JSON.stringify(data['2024']) : 'N/A');
    }

    // Check History Subcollection
    const historySnapshot = await db.collection(`issuerMetrics/${issuerId}/history`).get();
    if (historySnapshot.empty) {
        console.log(`[HISTORY] No history documents found!`);
    } else {
        console.log(`[HISTORY] Found ${historySnapshot.size} documents.`);
        historySnapshot.forEach(doc => {
            const data = doc.data();
            console.log(`   ID: ${doc.id} | Period: ${data.period} | Activos: ${data.activosTotales} | Utilidad: ${data.utilidadNeta}`);
        });
    }
}

async function main() {
    // Check the problematic ones + working one for reference
    const issuers = ['fama', 'banpro', 'fid', 'agricorp'];
    for (const id of issuers) {
        await inspectIssuer(id);
    }
}

main().catch(console.error);
