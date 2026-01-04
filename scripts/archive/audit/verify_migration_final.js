const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'mvp-nic-market' });
const db = admin.firestore();

async function verifyMigration() {
    console.log("--- FINAL VERIFICATION ---");
    const targetId = "agri-corp";

    // 1. Check Issuer
    const issuerDoc = await db.collection('issuers').doc(targetId).get();
    if (issuerDoc.exists) {
        const data = issuerDoc.data();
        console.log(`Issuer ${targetId} exists. Docs count: ${data.documents?.length || 0}`);
    } else {
        console.log(`Issuer ${targetId} NOT FOUND!`);
    }

    // 2. Check Chunks
    const chunksSnap = await db.collection('documentChunks')
        .where('issuerId', '==', targetId)
        .limit(10)
        .get();

    console.log(`Chunks found under ${targetId}: ${chunksSnap.size} (Sample check of 10)`);
    if (chunksSnap.size > 0) {
        chunksSnap.docs.forEach((d, i) => {
            console.log(` Chunk ${i} ID: ${d.id}`);
        });
    }

    // 3. Confirm old ID is empty of chunks
    const oldChunksSnap = await db.collection('documentChunks')
        .where('issuerId', '==', "corporaci-n-agricola")
        .limit(1)
        .get();
    console.log(`Old ID chunks remaining: ${oldChunksSnap.size}`);
}
verifyMigration();
