const admin = require('firebase-admin');
const serviceAccount = require('./functions/serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function check() {
    const issuers = ["agri-corp", "bdf", "fama", "banco-de-la-producci-n"];
    console.log("Checking Document Chunks...");

    for (const id of issuers) {
        const snap = await db.collection('documentChunks').where('issuerId', '==', id).count().get();
        console.log(`${id}: ${snap.data().count} chunks`);
    }
}

check().then(() => process.exit(0));
