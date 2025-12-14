// Fix: Count actual chunks and update documentsProcessed for each issuer
const admin = require('firebase-admin');

admin.initializeApp({
    projectId: 'mvp-nic-market'
});

const db = admin.firestore();

async function fixDocumentsProcessed() {
    console.log('🔧 Fixing documentsProcessed field by counting actual chunks...\n');

    // Get all active issuers
    const issuersSnapshot = await db.collection('issuers').where('isActive', '==', true).get();
    console.log(`Found ${issuersSnapshot.size} active issuers\n`);

    const updates = [];

    for (const issuerDoc of issuersSnapshot.docs) {
        const issuerId = issuerDoc.id;
        const issuerData = issuerDoc.data();

        // Count chunks for this issuer
        const chunksQuery = await db.collection('documentChunks')
            .where('issuerId', '==', issuerId)
            .get();

        const chunkCount = chunksQuery.size;

        // Get unique document IDs from chunks
        const uniqueDocs = new Set();
        chunksQuery.forEach(doc => {
            const data = doc.data();
            if (data.documentId) {
                uniqueDocs.add(data.documentId);
            }
        });

        const docsProcessed = uniqueDocs.size;

        console.log(`${issuerData.name}:`);
        console.log(`  - Chunks: ${chunkCount}`);
        console.log(`  - Unique Docs: ${docsProcessed}`);
        console.log(`  - Current documentsProcessed: ${issuerData.documentsProcessed || 0}`);

        if (docsProcessed > 0) {
            updates.push({
                id: issuerId,
                name: issuerData.name,
                docsProcessed: docsProcessed,
                chunks: chunkCount
            });
        }
    }

    if (updates.length > 0) {
        console.log(`\n✅ Updating ${updates.length} issuers...\n`);

        const batch = db.batch();
        updates.forEach(update => {
            const ref = db.collection('issuers').doc(update.id);
            batch.update(ref, {
                documentsProcessed: update.docsProcessed,
                lastProcessed: new Date(),
                isActive: true
            });
        });

        await batch.commit();
        console.log('✅ Update complete!\n');

        // Show summary
        console.log('📊 Summary:');
        updates.forEach((u, idx) => {
            console.log(`${idx + 1}. ${u.name}: ${u.docsProcessed} docs, ${u.chunks} chunks`);
        });
    } else {
        console.log('⚠️  No issuers found with chunks!');
    }
}

fixDocumentsProcessed()
    .then(() => {
        console.log('\n🎉 Fix complete! Refresh the frontend to see data.');
        process.exit(0);
    })
    .catch(err => {
        console.error('\n❌ Error:', err);
        process.exit(1);
    });
