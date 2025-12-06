// Quick Firestore diagnostic script
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp();
const db = getFirestore();

async function diagnose() {
    console.log('📊 FIRESTORE DIAGNOSTIC\n');

    // Check issuers collection
    const issuersSnap = await db.collection('issuers').get();
    console.log(`Total issuers in collection: ${issuersSnap.size}`);

    let activeCount = 0;
    let withDocsProcessed = 0;

    issuersSnap.forEach(doc => {
        const data = doc.data();
        console.log(`\n${doc.id}:`);
        console.log(`  - isActive: ${data.isActive}`);
        console.log(`  - documentsProcessed: ${data.documentsProcessed || 0}`);
        console.log(`  - lastProcessed: ${data.lastProcessed?.toDate?.() || 'never'}`);

        if (data.isActive) activeCount++;
        if (data.documentsProcessed > 0) withDocsProcessed++;
    });

    console.log(`\n\nSUMMARY:`);
    console.log(`- Active issuers: ${activeCount}`);
    console.log(`- With docs processed > 0: ${withDocsProcessed}`);

    // Check chunks still exist
    const chunksSnap = await db.collection('documentChunks').limit(10).get();
    console.log(`- Sample chunks still exist: ${chunksSnap.size > 0 ? 'YES' : 'NO'}`);
}

diagnose().catch(console.error);
