const admin = require("firebase-admin");
const { getFirestore } = require("firebase-admin/firestore");

if (!admin.apps.length) {
    admin.initializeApp();
}

const db = getFirestore();

async function checkSpecificDocs() {
    const issuerId = "agri-corp";
    const titles = [
        "AGRICORP SUPLEMENTO 2023 (PDF)",
        "AGRICORP SUPLEMENTO 2022 (PDF)",
        "AGRICORP AUDITADOS 2024 (PDF)"
    ];

    console.log(`Checking specific documents for: ${issuerId}`);

    for (const title of titles) {
        const snapshot = await db.collection("documentChunks")
            .where("issuerId", "==", issuerId)
            .where("metadata.documentTitle", "==", title)
            .get();

        console.log(`Document: ${title} -> Found ${snapshot.size} chunks.`);
    }
}

checkSpecificDocs().catch(console.error);
