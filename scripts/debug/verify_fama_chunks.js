const admin = require('firebase-admin');
const serviceAccount = require('./functions/service-account.json'); // Assuming you might have one, or use default creds if running locally with `firebase functions:shell` or similar. 
// Actually, for local script execution without a service account file, it's easier to use `firebase-admin` with application default credentials if logged in via gcloud, 
// OR just run this within the context of the functions shell. 
// Let's try to make it a standalone script that initializes with default credentials.

if (admin.apps.length === 0) {
    admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: 'mvp-nic-market'
    });
}

const db = admin.firestore();

async function checkFamaChunks() {
    console.log("Checking chunks for 'fama'...");

    try {
        // 1. Check count
        const snapshot = await db.collection('documentChunks')
            .where('issuerId', '==', 'fama')
            .count()
            .get();

        console.log(`Total chunks for 'fama': ${snapshot.data().count}`);

        // 2. Check most recent chunks (without the index this might fail if we run it directly against cloud, 
        // but let's try to fetch without ordering first to see what we have)
        const recentSnapshot = await db.collection('documentChunks')
            .where('issuerId', '==', 'fama')
            .limit(20)
            .get();

        console.log("\nSample chunks:");
        const chunks = [];
        recentSnapshot.forEach(doc => {
            const data = doc.data();
            chunks.push({
                id: doc.id,
                date: data.metadata?.documentDate,
                title: data.metadata?.documentTitle,
                timestamp: data.timestamp ? new Date(data.timestamp._seconds * 1000).toISOString() : 'N/A'
            });
        });

        // Sort manually to see what we have
        chunks.sort((a, b) => {
            if (a.date && b.date) return new Date(b.date) - new Date(a.date);
            return 0;
        });

        chunks.forEach(c => {
            console.log(`- [${c.date}] ${c.title} (Timestamp: ${c.timestamp})`);
        });

    } catch (error) {
        console.error("Error querying chunks:", error);
    }
}

checkFamaChunks();
