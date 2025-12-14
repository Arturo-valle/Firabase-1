const admin = require('firebase-admin');

admin.initializeApp();

const db = admin.firestore();

const ISSUER_ID = "horizonte-fondo-de-inversi-n-financiero-de-crecimiento-d-lares-no-diversificado";

async function checkHorizonte() {
    console.log(`Checking Firestore for Issuer ID: ${ISSUER_ID} ...`);

    try {
        const doc = await db.collection('issuers').doc(ISSUER_ID).get();
        if (!doc.exists) {
            console.log("❌ Issuer Document NOT FOUND.");
        } else {
            const data = doc.data();
            console.log("✅ Issuer Found:", data.name);
            console.log(`- Documents Count: ${data.documents ? data.documents.length : 0}`);
            if (data.documents && data.documents.length > 0) {
                console.log("- First 5 Docs:");
                data.documents.slice(0, 5).forEach(d => console.log(`   [${d.date}] ${d.type} - ${d.title} (${d.url})`));
            }
        }

        console.log("\nChecking 'facts' collection for mentions of 'Horizonte'...");
        const factsSnapshot = await db.collection('facts').get();
        let matchCount = 0;
        factsSnapshot.forEach(doc => {
            const fact = doc.data();
            const text = (fact.issuerName || '') + ' ' + (fact.title || '');
            if (text.toLowerCase().includes('horizonte')) {
                matchCount++;
                if (matchCount <= 5) {
                    console.log(`✅ Fact Match: [${fact.date}] ${fact.issuerName} - ${fact.title}`);
                }
            }
        });
        console.log(`Total 'Horizonte' facts found: ${matchCount}`);

    } catch (e) {
        console.error("Error:", e);
    }
}

checkHorizonte();
