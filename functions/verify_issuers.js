const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize Firebase Admin SDK
if (admin.apps.length === 0) {
    admin.initializeApp();
}
const db = getFirestore();

async function verifyIssuers() {
    console.log('🔍 Verifying Firestore Data...');

    try {
        const metadataDoc = await db.collection('system').doc('market_metadata').get();
        if (!metadataDoc.exists) {
            console.log('❌ Metadata document not found!');
        } else {
            const data = metadataDoc.data();
            console.log(`✅ Metadata found. Total Active Issuers: ${data.totalActive}`);
            console.log('   Active Issuers List:', data.activeIssuers.map(i => i.name).join(', '));
        }

        const issuersSnapshot = await db.collection('issuers').where('active', '==', true).get();
        console.log(`\n✅ Found ${issuersSnapshot.size} active issuer documents in 'issuers' collection.`);

        issuersSnapshot.forEach(doc => {
            const data = doc.data();
            console.log(`   - ${data.name} (${data.sector})`);
        });

    } catch (error) {
        console.error('❌ Error verifying data:', error);
    }
}

verifyIssuers().catch(console.error);
