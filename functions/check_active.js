const { getFirestore } = require('firebase-admin/firestore');
const admin = require('firebase-admin');

if (admin.apps.length === 0) admin.initializeApp();
const db = getFirestore();

async function checkActiveStatus() {
    console.log('🕵️ Checking Issuer Active Status...');
    const snapshot = await db.collection('issuers').get();

    snapshot.forEach(doc => {
        const data = doc.data();
        console.log(`ID: ${doc.id.padEnd(15)} | Active: ${data.active} (${typeof data.active}) | Name: ${data.name}`);
    });
}

checkActiveStatus();
