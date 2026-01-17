const admin = require('firebase-admin');

if (!admin.apps.length) {
    admin.initializeApp({
        projectId: "mvp-nic-market"
    });
}

const db = admin.firestore();

async function inspectIssuers() {
    const list = ['banpro', 'fdl', 'fid', 'horizonte'];
    for (const id of list) {
        console.log(`\n--- Inspecting ${id} ---`);
        const issuerDoc = await db.collection('issuers').doc(id).get();
        if (issuerDoc.exists) {
            const docs = issuerDoc.data().documents || [];
            console.log(`  Registered Docs: ${docs.length}`);
            console.log(`  Sample: ${docs.slice(0, 3).map(d => d.title).join(', ')}`);
        } else {
            console.log(`  ❌ Issuer document not found.`);
        }

        const chunks = await db.collection('documentChunks').where('issuerId', '==', id).limit(5).get();
        console.log(`  documentChunks Found: ${chunks.size}`);

        const vectors = await db.collection('fact_vectors').where('issuerId', '==', id).limit(5).get();
        console.log(`  fact_vectors Found: ${vectors.size}`);
    }
}

inspectIssuers().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
