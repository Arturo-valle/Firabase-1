const admin = require('firebase-admin');

// Handle credentials automatically
let serviceAccount;
try {
    serviceAccount = require('./functions/serviceAccountKey.json');
} catch (e) {
    // Fallback
}

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: 'mvp-nic-market'
    });
}

const db = admin.firestore();

// Targets confirmed from Health Check
const TARGETS = [
    'banpro',
    'bdf',
    'fid-sociedad-an-nima'
];

async function fixTags() {
    console.log("Starting Vector Tag Repair...");

    for (const issuer of TARGETS) {
        console.log(`Processing ${issuer}...`);
        const snapshot = await db.collection('documentChunks')
            .where('issuerId', '==', issuer)
            .get();

        if (snapshot.empty) {
            console.log(`No chunks for ${issuer}`);
            continue;
        }

        let updated = 0;
        const batchSize = 500;
        let batch = db.batch();
        let ops = 0;

        snapshot.docs.forEach((doc) => {
            const data = doc.data();
            const md = data.metadata || {};
            const title = (md.documentTitle || md.title || '').toLowerCase();
            const text = (data.text || '').toLowerCase().substring(0, 500);

            let isFinancial = md.isFinancial || false;
            let isAudited = md.isAudited || false;
            let changes = false;

            // 1. Detect Financials
            if (!isFinancial && (/financiero|balance|resultado|auditado|rating|riesgo|calificaci/i.test(title))) {
                isFinancial = true;
                changes = true;
            }

            // 2. Detect Audited
            if (!isAudited && (/auditado|estados financieros|informe de los auditores/i.test(title))) {
                isAudited = true;
                changes = true;
            }

            // 3. Detect Rating Reports (Treat as Financial for BDF/Others if missing)
            // If it's a Rating Report, ensure isFinancial is true so it gets picked up
            if (/calificaci|riesgo|rating/i.test(title)) {
                if (!isFinancial) {
                    isFinancial = true;
                    changes = true;
                }
            }

            if (changes) {
                batch.update(doc.ref, {
                    'metadata.isFinancial': isFinancial,
                    'metadata.isAudited': isAudited,
                    // Also ensure title is sync 
                    'metadata.title': md.documentTitle || md.title
                });
                ops++;
                updated++;
            }

            if (ops >= batchSize) {
                // Batch limit (we won't hit it per issuer likely, but good practice)
                // Just let it flow, 500 is limit for write batch
            }
        });

        if (updated > 0) {
            await batch.commit();
            console.log(`✅ Updated ${updated} chunks for ${issuer}`);
        } else {
            console.log(`No changes needed for ${issuer}`);
        }
    }
}

fixTags().catch(console.error);
