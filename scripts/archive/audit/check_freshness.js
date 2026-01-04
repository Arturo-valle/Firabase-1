const admin = require('firebase-admin');
admin.initializeApp({
    projectId: 'mvp-nic-market'
});
const db = admin.firestore();

async function checkLatestDocs(issuerId) {
    console.log(`\n--- Checking Documents for ${issuerId} ---`);
    const chunksRef = db.collection('documentChunks');

    // Check by createdAt (System Ingestion Time)
    const recentIngestion = await chunksRef
        .where('issuerId', '==', issuerId)
        .orderBy('createdAt', 'desc')
        .limit(5)
        .get();

    console.log(`[Most Recently Ingested Chunks]`);
    if (recentIngestion.empty) console.log("No chunks found.");
    recentIngestion.forEach(doc => {
        const d = doc.data();
        console.log(`- Created: ${d.createdAt?.toDate ? d.createdAt.toDate() : d.createdAt} | Date: ${d.metadata?.documentDate} | Title: ${d.metadata?.title || d.metadata?.documentTitle} | Type: ${d.metadata?.docType}`);
    });

    // Check by documentDate (Real Document Time)
    // Note: This often requires a composite index. if it fails, we'll see the error.
    try {
        const recentDates = await chunksRef
            .where('issuerId', '==', issuerId)
            .orderBy('metadata.documentDate', 'desc')
            .limit(5)
            .get();

        console.log(`\n[Most Recent Document Dates]`);
        if (recentDates.empty) console.log("No chunks found with dates.");
        recentDates.forEach(doc => {
            const d = doc.data();
            console.log(`- Date: ${d.metadata?.documentDate} | Created: ${d.createdAt?.toDate ? d.createdAt.toDate() : d.createdAt} | Title: ${d.metadata?.title || d.metadata?.documentTitle}`);
        });
    } catch (e) {
        console.log("Could not query by metadata.documentDate (Index missing?)", e.message);
    }
}

async function run() {
    await checkLatestDocs('banpro');
    await checkLatestDocs('bdf');
    await checkLatestDocs('fama');
}

run().catch(console.error);
