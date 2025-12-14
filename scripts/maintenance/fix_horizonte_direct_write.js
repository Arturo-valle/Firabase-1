const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize Firebase Admin
if (admin.apps.length === 0) {
    admin.initializeApp();
}

const db = getFirestore();

async function fixHorizonte() {
    const shortId = 'horizonte-fondo-de-inversi-n';
    console.log(`Attempting to write to ${shortId}...`);

    try {
        await db.collection('issuers').doc(shortId).set({
            name: "Horizonte Fondo de Inversión",
            acronym: "HORIZONTE",
            active: true,
            documents: [],
            lastSync: admin.firestore.FieldValue.serverTimestamp(),
            manualFix: true
        }, { merge: true });
        console.log("✅ Successfully wrote Short ID document.");
    } catch (error) {
        console.error("❌ Error writing Short ID:", error);
    }
}

fixHorizonte();
