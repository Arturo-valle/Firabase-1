const { getFirestore } = require('firebase-admin/firestore');
const admin = require('firebase-admin');

if (admin.apps.length === 0) admin.initializeApp();
const db = getFirestore();

async function checkStatus() {
    const WHITELIST = ["agricorp", "banpro", "bdf", "fama", "fdl", "fid", "horizonte"];

    console.log('📊 System Status Verification');
    console.log('----------------------------');

    const issuersSnapshot = await db.collection("issuers").get();
    const allIssuers = issuersSnapshot.docs
        .map(doc => ({ ...doc.data(), id: doc.id }))
        .filter(i => WHITELIST.includes(i.id));

    let totalDocsAvailable = 0;
    let totalChunks = 0;

    for (const issuer of allIssuers) {
        const chunksSnap = await db.collection('documentChunks')
            .where('issuerId', '==', issuer.id)
            .count()
            .get();

        const chunksCount = chunksSnap.data().count;
        const totalDocs = issuer.documents?.length || 0;

        console.log(`${issuer.name.padEnd(30)} | Docs: ${totalDocs.toString().padEnd(4)} | Chunks: ${chunksCount}`);

        totalDocsAvailable += totalDocs;
        totalChunks += chunksCount;
    }

    console.log('----------------------------');
    console.log(`Total Documents: ${totalDocsAvailable}`);
    console.log(`Total Chunks:    ${totalChunks}`);

    // Crude estimation of coverage (assuming ~30 chunks per doc average, but better to track processed flag)
    // The controller uses 'documentsProcessed' / 'totalDocs'. Let's check that too.

    const totalProcessed = allIssuers.reduce((acc, i) => acc + (i.documentsProcessed || 0), 0);
    console.log(`Processed Docs:  ${totalProcessed} (${((totalProcessed / totalDocsAvailable) * 100).toFixed(1)}%)`);
}

checkStatus();
