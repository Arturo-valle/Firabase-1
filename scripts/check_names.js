const admin = require('firebase-admin');

if (admin.apps.length === 0) {
    admin.initializeApp({ projectId: 'mvp-nic-market' });
}

const db = admin.firestore();

async function listIssuers() {
    console.log('--- LISTADO DE EMISORES EN FIRESTORE ---');
    const snapshot = await db.collection('issuers').get();

    snapshot.docs.forEach(doc => {
        const data = doc.data();
        console.log(`ID: "${doc.id}" | Name: "${data.name}" | Normalized: "${data.name?.toLowerCase()}"`);
    });
}

listIssuers().catch(console.error);
