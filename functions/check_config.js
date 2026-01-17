const { getFirestore } = require('firebase-admin/firestore');
const admin = require('firebase-admin');

if (admin.apps.length === 0) admin.initializeApp();
const db = getFirestore();

async function checkSystemConfig() {
    console.log('🕵️ Checking System Config...');
    const doc = await db.collection('system_config').doc('issuers').get();

    if (doc.exists) {
        console.log('⚠️ Config Found:', JSON.stringify(doc.data(), null, 2));
    } else {
        console.log('✅ No system_config/issuers doc found. Using hardcoded defaults.');
    }
}

checkSystemConfig();
