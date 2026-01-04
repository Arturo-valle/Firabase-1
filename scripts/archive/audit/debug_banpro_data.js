const admin = require('firebase-admin');
// Initialize without specific credential to use Application Default Credentials (ADC)
// This works if GOOGLE_APPLICATION_CREDENTIALS is set or via gcloud auth
admin.initializeApp({
    projectId: 'mvp-nic-market'
});

const db = admin.firestore();

async function debugBanpro() {
    console.log('--- DEBUGGING BANPRO DATA ---');

    // 1. Get Current Metrics
    const metricDoc = await db.collection('issuerMetrics').doc('banpro').get();
    if (!metricDoc.exists) {
        console.log('No metrics found for Banpro (id: banpro)');
    } else {
        const data = metricDoc.data();
        console.log('Current Metrics (Firestore):');
        console.log(JSON.stringify(data.capital, null, 2));
        console.log('Metadata:', data.metadata);
    }

    // 2. Get Source Chunks
    // Try both IDs just in case
    const idsToCheck = ['banpro', 'banco-de-la-produccion'];

    for (const id of idsToCheck) {
        console.log(`\nChecking chunks for issuerId: ${id}...`);
        const chunks = await db.collection('documentChunks')
            .where('issuerId', '==', id)
            .orderBy('createdAt', 'desc')
            .limit(10)
            .get();

        if (chunks.empty) {
            console.log('No chunks found.');
            continue;
        }

        console.log(`Found ${chunks.size} recent chunks.`);
        chunks.docs.forEach((doc, i) => {
            const d = doc.data();
            const text = d.text || '';
            // Search for keywords related to Total Assets
            if (text.toLowerCase().includes('activo') || text.toLowerCase().includes('total')) {
                console.log(`\n[Chunk ${i}] ID: ${doc.id}`);
                console.log(`Title: ${d.metadata?.title || 'No Title'}`);
                console.log(`Date: ${d.metadata?.date || d.metadata?.documentDate}`);
                // Print snippet around "Total Activo" or similar
                const regex = /total\s+ac?tivos?|total\s+assets?/i;
                const match = text.match(regex);
                if (match) {
                    const start = Math.max(0, match.index - 50);
                    const end = Math.min(text.length, match.index + 150);
                    console.log(`Snippet: ...${text.substring(start, end).replace(/\n/g, ' ')}...`);
                } else {
                    console.log('Snippet (Head):', text.substring(0, 100).replace(/\n/g, ' '));
                }
            }
        });
    }
}

debugBanpro().catch(console.error);
