const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkStatus() {
    console.log('Checking Firestore Status...');

    // Check total issuers
    const allIssuers = await db.collection('issuers').get();
    console.log(`Total Issuers in DB: ${allIssuers.size}`);

    // Check active issuers
    const activeIssuers = await db.collection('issuers').where('isActive', '==', true).get();
    console.log(`Active Issuers: ${activeIssuers.size}`);

    // Check processed issuers
    let processedCount = 0;
    let totalDocsProcessed = 0;

    allIssuers.forEach(doc => {
        const data = doc.data();
        if (data.documentsProcessed > 0) {
            processedCount++;
            totalDocsProcessed += data.documentsProcessed;
            console.log(`- ${data.name}: ${data.documentsProcessed} docs processed`);
        }
    });

    console.log(`Processed Issuers (count > 0): ${processedCount}`);
    console.log(`Total Documents Processed: ${totalDocsProcessed}`);

    // Check chunks
    const chunks = await db.collection('documentChunks').count().get();
    console.log(`Total Chunks: ${chunks.data().count}`);
}

checkStatus().catch(console.error);
