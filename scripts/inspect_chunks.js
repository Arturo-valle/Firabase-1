const admin = require('firebase-admin');

// Set project ID explicitly
process.env.GCLOUD_PROJECT = 'mvp-nic-market';

// Initialize
if (!admin.apps.length) {
    admin.initializeApp({
        projectId: "mvp-nic-market"
    });
}
const db = admin.firestore();

async function inspect(issuerId) {
    console.log(`\n🔍 INSPECTING CHUNKS FOR: ${issuerId}`);

    // Check aliases
    const aliases = [issuerId, 'agri-corp', 'corporacion-agricola']; // naive list, better to import config but this is quick

    const snapshot = await db.collection('documentChunks')
        .where('issuerId', 'in', aliases)
        .limit(500)
        .get();

    let docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    // Sort desc by date
    docs.sort((a, b) => {
        const da = a.metadata?.documentDate ? new Date(a.metadata.documentDate) : new Date(0);
        const db = b.metadata?.documentDate ? new Date(b.metadata.documentDate) : new Date(0);
        return db - da;
    });

    if (docs.length === 0) {
        console.log("❌ No chunks found.");
        return;
    }

    console.log(`Found ${docs.length} chunks. Showing top 20 most recent:`);
    docs.slice(0, 20).forEach(d => {
        const md = d.metadata || {};
        console.log(`- [${d.id}] Title: ${md.title || 'No Title'} | Date: ${md.documentDate || 'No Date'}`);
    });
}

inspect('agricorp').catch(console.error).then(() => process.exit(0));
