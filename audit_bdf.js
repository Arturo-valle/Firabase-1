const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'mvp-nic-market' });
const db = admin.firestore();

async function listBDFDocuments() {
    console.log("--- Inventario de Documentos: BDF ---");
    const chunks = await db.collection('documentChunks')
        .where('issuerId', '==', 'bdf')
        .select('metadata.documentTitle', 'metadata.title', 'metadata.documentDate', 'metadata.docType', 'createdAt')
        .get();

    const uniqueDocs = new Map();

    chunks.docs.forEach(doc => {
        const m = doc.data().metadata || {};
        const title = m.documentTitle || m.title || 'Sin Título';
        // Use title + date as key
        const key = `${title} (${m.documentDate || 'Sin Fecha'})`;

        if (!uniqueDocs.has(key)) {
            uniqueDocs.set(key, {
                type: m.docType || m.documentType,
                created: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : doc.data().createdAt,
                count: 1
            });
        } else {
            uniqueDocs.get(key).count++;
        }
    });

    // Convert to array and sort by date (if possible)
    const sortedDocs = Array.from(uniqueDocs.entries()).sort((a, b) => {
        // Sort by creation date desc
        return b[1].created - a[1].created;
    });

    sortedDocs.forEach(([name, details]) => {
        console.log(`[${details.count} chunks] ${name} | Tipo: ${details.type} | Ingerido: ${details.created}`);
    });
}

listBDFDocuments();
