const admin = require("firebase-admin");
const { getFirestore } = require("firebase-admin/firestore");

if (!admin.apps.length) {
    admin.initializeApp();
}

const db = getFirestore();

async function countChunksSafely() {
    const issuerId = "agri-corp";
    console.log(`Auditing AGRICORP Chunks...`);

    // Count total chunks
    const totalSnap = await db.collection("documentChunks").where("issuerId", "==", issuerId).count().get();
    console.log(`Total chunks for ${issuerId}: ${totalSnap.data().count}`);

    // Try to find if 2023 exists in ANY chunk metadata
    // We'll just fetch a few and print titles
    const sampleSnap = await db.collection("documentChunks")
        .where("issuerId", "==", issuerId)
        .limit(50)
        .get();

    const titles = new Set();
    sampleSnap.forEach(doc => titles.add(doc.data().metadata?.documentTitle));

    console.log("Sample document titles found:");
    titles.forEach(t => console.log(`- ${t}`));

    // Check specific problematic years
    const year2023 = await db.collection("documentChunks")
        .where("issuerId", "==", issuerId)
        .where("metadata.documentTitle", "==", "AGRICORP SUPLEMENTO 2023 (PDF)")
        .count().get();
    console.log(`2023 Supplement chunks: ${year2023.data().count}`);

    const year2022 = await db.collection("documentChunks")
        .where("issuerId", "==", issuerId)
        .where("metadata.documentTitle", "==", "AGRICORP SUPLEMENTO 2022 (PDF)")
        .count().get();
    console.log(`2022 Supplement chunks: ${year2022.data().count}`);

    const year2024 = await db.collection("documentChunks")
        .where("issuerId", "==", issuerId)
        .where("metadata.documentTitle", "==", "231024 AGRICORP PROSPECTO 2024 (PDF)")
        .count().get();
    console.log(`2024 Prospecto chunks: ${year2024.data().count}`);
}

countChunksSafely().catch(console.error);
