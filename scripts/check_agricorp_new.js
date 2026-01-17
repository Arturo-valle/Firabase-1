const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

if (!process.env.GCLOUD_PROJECT) process.env.GCLOUD_PROJECT = 'mvp-nic-market';
initializeApp();
const db = getFirestore();

async function checkAgriCorpHistory() {
    console.log("Checking issuerMetrics/agricorp/history...");
    const snap = await db.collection('issuerMetrics').doc('agricorp').collection('history').get();

    if (snap.empty) {
        console.log("❌ No history documents found.");
        return;
    }

    snap.forEach(doc => {
        console.log(`\n📅 Year: ${doc.id}`);
        console.log(JSON.stringify(doc.data(), null, 2));
    });
}

checkAgriCorpHistory();
