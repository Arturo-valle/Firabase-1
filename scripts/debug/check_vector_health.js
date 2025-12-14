const admin = require('firebase-admin');

// Handle credentials automatically
let serviceAccount;
try {
    serviceAccount = require('./functions/serviceAccountKey.json');
} catch (e) {
    // Fallback to default if local file missing
}

if (!admin.apps.length) {
    if (serviceAccount) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    } else {
        admin.initializeApp({
            credential: admin.credential.applicationDefault(),
            projectId: 'mvp-nic-market'
        });
    }
}

const db = admin.firestore();

const ISSUERS = [
    'agricorp',
    'banpro',
    'bdf',
    'fama',
    'financiera-fdl', // Corrected from 'fdl'
    'fid-sociedad-an-nima', // Corrected from 'fid'
    'horizonte-fondo-de-inversi-n-financiero-de-crecimiento-d-lares-no-diversificado' // Corrected from 'horizonte'
];

async function checkGlobalHealth() {
    console.log("Starting Global Vectorization Health Check...");
    console.log("------------------------------------------------");
    console.log("| Issuer      | Total Chunks | Financial Docs | Recent (2024/25) | Last Processed      |");
    console.log("------------------------------------------------");

    for (const issuer of ISSUERS) {
        try {
            const snapshot = await db.collection('documentChunks')
                .where('issuerId', '==', issuer)
                .orderBy('createdAt', 'desc')
                .limit(500) // Sample size
                .get();

            let totalChunks = snapshot.size;
            let financialCount = 0;
            let recentCount = 0;
            let lastDate = "N/A";

            if (!snapshot.empty) {
                lastDate = snapshot.docs[0].data().createdAt?.toDate().toISOString().split('T')[0] || "Unknown";

                snapshot.docs.forEach(doc => {
                    const data = doc.data();
                    const text = (data.text || "").toLowerCase();
                    const title = (data.metadata?.documentTitle || data.metadata?.title || "").toLowerCase();
                    const date = data.metadata?.date || "";

                    // Financial Check
                    if (data.metadata?.isFinancial ||
                        data.metadata?.isAudited ||
                        title.includes('financieros') ||
                        title.includes('auditados')) {
                        financialCount++;
                    }

                    // Recent Check
                    if (title.includes('2024') || title.includes('2025') || date.includes('2024') || date.includes('2025')) {
                        recentCount++;
                    }
                });
            }

            // Pad strings for table alignment
            const pName = issuer.padEnd(11);
            const pTotal = totalChunks.toString().padEnd(12);
            const pFin = financialCount.toString().padEnd(14);
            const pRec = recentCount.toString().padEnd(16);

            console.log(`| ${pName} | ${pTotal} | ${pFin} | ${pRec} | ${lastDate.padEnd(19)} |`);

        } catch (error) {
            console.error(`Error checking ${issuer}:`, error.message);
        }
    }
    console.log("------------------------------------------------");
}

checkGlobalHealth().catch(console.error);
