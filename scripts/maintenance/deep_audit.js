const admin = require('firebase-admin');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: 'mvp-nic-market'
    });
}

const db = admin.firestore();

async function runAudit() {
    const results = {};

    try {
        // 1. Chunks Audit
        const chunksSnap = await db.collection('documentChunks').limit(3).get();
        results.chunks = chunksSnap.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                issuerId: data.issuerId,
                documentId: data.documentId,
                hasEmbedding: !!(data.embedding && data.embedding.length > 0),
                embeddingLength: data.embedding ? data.embedding.length : 0,
                textSnippet: data.text ? data.text.substring(0, 100) + '...' : 'N/A',
                metadata: data.metadata
            };
        });

        // 2. Metrics Audit (Agricorp)
        const metricsDoc = await db.collection('issuerMetrics').doc('agricorp').get();
        results.metrics = metricsDoc.exists ? metricsDoc.data() : 'NOT_FOUND';

        // 3. History Audit (Agricorp)
        const historySnap = await db.collection('issuerMetrics').doc('agricorp').collection('history').orderBy('year', 'desc').get();
        results.history = historySnap.docs.map(doc => doc.data());

        console.log(JSON.stringify(results, null, 2));
    } catch (e) {
        console.error(e);
    }
}

runAudit();
