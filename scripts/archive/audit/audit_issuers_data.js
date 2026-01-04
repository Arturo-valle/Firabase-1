
const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize Firebase Admin (assuming default credentials or local emulator)
if (!admin.apps.length) {
    admin.initializeApp();
}

const db = getFirestore();

async function auditIssuer(issuerId) {
    console.log(`\n--- Auditing Issuer: ${issuerId} ---`);

    // Check if issuer exists
    const issuerDoc = await db.collection('issuers').doc(issuerId).get();
    if (!issuerDoc.exists) {
        console.log(`❌ Issuer ${issuerId} NOT FOUND in 'issuers' collection.`);
    } else {
        const data = issuerDoc.data();
        console.log(`✅ Issuer found: ${data.name}`);
        console.log(`   Documents Processed: ${data.documentsProcessed || 0}`);
    }

    // Check chunks
    const chunksSnap = await db.collection('documentChunks')
        .where('issuerId', '==', issuerId)
        .limit(10)
        .get();

    if (chunksSnap.empty) {
        console.log(`❌ No chunks found for ${issuerId}.`);

        // Try alternate IDs
        const alternates = {
            "agri-corp": ["agricorp", "corporaci-n-agricola"],
            "horizonte": ["horizonte-fondo-de-inversi-n", "horizonte-fondo-de-inversi-n-financiero-de-crecimiento-d-lares-no-diversificado"],
            "fid": ["fid-sociedad-an-nima"]
        };

        if (alternates[issuerId]) {
            for (const alt of alternates[issuerId]) {
                const altSnap = await db.collection('documentChunks').where('issuerId', '==', alt).limit(1).get();
                if (!altSnap.empty) {
                    console.log(`⚠️ Found chunks under alternate ID: ${alt}`);
                }
            }
        }
    } else {
        console.log(`✅ Found ${chunksSnap.size}+ chunks.`);
        const first = chunksSnap.docs[0].data();
        console.log(`   Sample Document: ${first.metadata?.documentTitle || first.metadata?.title || 'Unknown'}`);
        console.log(`   Sample Text Preview: ${first.text.substring(0, 100)}...`);
    }

    // Check existing metrics
    const metricsDoc = await db.collection('issuerMetrics').doc(issuerId).get();
    if (metricsDoc.exists) {
        console.log(`✅ Metrics found in 'issuerMetrics'.`);
        const m = metricsDoc.data();
        console.log(`   ROE: ${m.rentabilidad?.roe}, ROA: ${m.rentabilidad?.roa}, Margin: ${m.rentabilidad?.margenNeto}`);
    } else {
        console.log(`❌ No metrics found in 'issuerMetrics'.`);
    }
}

async function run() {
    await auditIssuer('horizonte');
    await auditIssuer('fid');
    await auditIssuer('agri-corp');
    process.exit(0);
}

run().catch(console.error);
