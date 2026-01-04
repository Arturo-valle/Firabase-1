const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp();
const db = getFirestore();

async function checkAgriCorp() {
    const doc = await db.collection('issuerMetrics').doc('agri-corp').get();
    if (!doc.exists) {
        console.log("No existe el documento");
        return;
    }
    console.log(JSON.stringify(doc.data(), null, 2));
}

checkAgriCorp();
