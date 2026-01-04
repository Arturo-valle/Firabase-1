const admin = require('firebase-admin');

// Note: Using serviceAccountKey.json if available, or ADC
const db = admin.firestore();

if (admin.apps.length === 0) {
    admin.initializeApp();
}

const ISSUER_ID = "agri-corp";
const YEARS = ["2020", "2021", "2022", "2023", "2024"];

async function deepAudit() {
    console.log(`Deep audit for ${ISSUER_ID}...`);

    // Check various ID variations
    const candidates = [ISSUER_ID, "corporaci-n-agricola", "agricorp"];

    for (const id of candidates) {
        console.log(`\nChecking chunks for ID variant: ${id}`);
        const snap = await db.collection('documentChunks').where('issuerId', '==', id).get();
        console.log(`Total chunks: ${snap.size}`);

        if (snap.size > 0) {
            const yearCounts = {};
            YEARS.forEach(y => yearCounts[y] = 0);

            snap.forEach(doc => {
                const data = doc.data();
                const text = data.text || "";
                const title = data.metadata?.documentTitle || data.metadata?.title || "";

                YEARS.forEach(year => {
                    if (text.includes(year) || title.includes(year)) {
                        yearCounts[year]++;
                    }
                });
            });

            console.table(yearCounts);
        }
    }
}

deepAudit().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
