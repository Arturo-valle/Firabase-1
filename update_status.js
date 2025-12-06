const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const ACTIVE_ISSUERS = [
    'banco de finanzas',
    'banco de la produccion',
    'corporacion agricola',
    'fama',
    'financiera fdl',
    'fid, sociedad anonima',
    'invercasa safi',
    'invercasasafi' // Mantener ambas variantes de Invercasa por si acaso
];

async function updateIssuerStatus() {
    console.log('🔄 Updating issuer status based on Active List...');

    const issuersRef = db.collection('issuers');
    const snapshot = await issuersRef.get();

    let activeCount = 0;
    let inactiveCount = 0;
    const batch = db.batch();

    snapshot.forEach(doc => {
        const issuerId = doc.id.toLowerCase();
        const data = doc.data();

        // Check if issuer is in our active list
        // We use includes because sometimes IDs might have slight variations
        const isActive = ACTIVE_ISSUERS.some(activeId => issuerId.includes(activeId) || activeId.includes(issuerId));

        const ref = issuersRef.doc(doc.id);

        if (isActive) {
            batch.update(ref, { isActive: true });
            console.log(`✅ Marked ACTIVE: ${data.name} (${doc.id})`);
            activeCount++;
        } else {
            batch.update(ref, { isActive: false });
            // console.log(`❌ Marked INACTIVE: ${data.name} (${doc.id})`);
            inactiveCount++;
        }
    });

    await batch.commit();

    console.log('\n📊 Summary:');
    console.log(`Total Issuers: ${snapshot.size}`);
    console.log(`Active: ${activeCount}`);
    console.log(`Inactive: ${inactiveCount}`);
}

updateIssuerStatus().catch(console.error);
