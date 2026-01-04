const admin = require('firebase-admin');
const serviceAccount = require('../functions/serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function run() {
    console.log("Listing Issuers in Firestore...");
    const snap = await db.collection('issuers').get();
    snap.forEach(doc => {
        console.log(`- ${doc.id} (${doc.data().name})`);
    });
}

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
