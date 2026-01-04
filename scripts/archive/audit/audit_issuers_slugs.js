const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'mvp-nic-market' });
const db = admin.firestore();

async function listIssuers() {
    const snap = await db.collection('issuers').where('active', '==', true).get();
    snap.docs.forEach(d => {
        console.log(`Name: ${d.data().name}, ID: ${d.id}, DetailUrl: ${d.data().detailUrl}`);
    });
}
listIssuers();
