
const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp({
        projectId: 'mvp-nic-market'
    });
}

const db = admin.firestore();

async function auditIssuer(issuerId) {
    try {
        console.log(`\n--- Auditing Issuer: ${issuerId} ---`);

        const issuerDoc = await db.collection('issuers').doc(issuerId).get();
        if (!issuerDoc.exists) {
            console.log(`❌ Issuer ${issuerId} NOT FOUND.`);
        } else {
            console.log(`✅ Issuer found: ${issuerDoc.data().name}`);
        }

        const chunksSnap = await db.collection('documentChunks')
            .where('issuerId', '==', issuerId)
            .limit(1)
            .get();

        if (chunksSnap.empty) {
            console.log(`❌ No chunks found for primary ID: ${issuerId}`);

            // Search for potential alternate IDs in documentChunks
            const allChunksSnap = await db.collection('documentChunks').limit(1000).get();
            const allIds = new Set();
            allChunksSnap.docs.forEach(d => allIds.add(d.data().issuerId));

            console.log(`   Available IDs in chunks: ${Array.from(allIds).join(', ')}`);

            const normalizedIssuerId = issuerId.toLowerCase().replace(/[^a-z0-9]/g, '');
            const match = Array.from(allIds).find(id => id.toLowerCase().replace(/[^a-z0-9]/g, '').includes(normalizedIssuerId));

            if (match) {
                console.log(`💡 Potential match found: ${match}`);
            }
        } else {
            console.log(`✅ Chunks found for ${issuerId}.`);
        }

        const metricsDoc = await db.collection('issuerMetrics').doc(issuerId).get();
        if (metricsDoc.exists) {
            console.log(`✅ Metrics found.`);
            console.log(JSON.stringify(metricsDoc.data().rentabilidad, null, 2));
        } else {
            console.log(`❌ No metrics found.`);
        }
    } catch (e) {
        console.error(`Error auditing ${issuerId}:`, e);
    }
}

async function run() {
    await auditIssuer('horizonte');
    await auditIssuer('fid');
    await auditIssuer('agri-corp');
}

run();
