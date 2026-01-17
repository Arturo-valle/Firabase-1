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

async function audit(issuerId) {
    console.log(`\n🔍 AUDITING DATA FOR ISSUER: ${issuerId}`);

    const metricsDoc = await db.collection('issuers').doc(issuerId).get();
    if (!metricsDoc.exists) {
        console.log(`❌ Issuer document (issuers/${issuerId}) DOES NOT EXIST.`);
    } else {
        console.log(`✅ Issuer document found.`);
        const data = metricsDoc.data();
        console.log(`Name: ${data.name}`);
        console.log(`Documents Registered: ${data.documents ? data.documents.length : 0}`);
        if (data.documents) {
            console.log("Last 5 Documents:");
            data.documents.slice(-5).forEach(d => console.log(`- ${d.title} (${d.date}) [${d.url}]`));
        }
    }

    // 2. Check History Subcollection
    console.log(`\nChecking History (issuerMetrics/${issuerId}/history)...`);
    const historySnapshot = await db.collection('issuerMetrics').doc(issuerId).collection('history').orderBy('year', 'desc').get();

    if (historySnapshot.empty) {
        console.log(`❌ No history documents found.`);
    } else {
        console.log(`✅ Found ${historySnapshot.size} history records.`);
        historySnapshot.forEach(doc => {
            console.log(`\n--- Year: ${doc.id} ---`);
            console.log(JSON.stringify(doc.data(), null, 2));
        });
    }

    process.exit(0);
}

const targetIssuer = process.argv[2] || 'agri';
audit(targetIssuer).catch(e => {
    console.error(e);
    process.exit(1);
});
