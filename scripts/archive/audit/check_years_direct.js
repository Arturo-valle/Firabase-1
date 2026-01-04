const admin = require("firebase-admin");
const { getFirestore } = require("firebase-admin/firestore");

if (!admin.apps.length) {
    admin.initializeApp();
}

const db = getFirestore();

async function checkSpecificYears() {
    const issuerId = "agri-corp";
    const years = ["2022", "2023", "2024"];

    console.log(`Checking specific years for: ${issuerId}`);

    for (const year of years) {
        // We can't filter by metadata field easily in a simple query without indexing
        // but we can search for a sample and check manually
        const snapshot = await db.collection("documentChunks")
            .where("issuerId", "==", issuerId)
            .limit(1000) // Look at a large sample
            .get();

        let count = 0;
        const docTitles = new Set();

        snapshot.forEach(doc => {
            const md = doc.data().metadata || {};
            const date = md.documentDate || md.date || "";
            if (date.includes(year)) {
                count++;
                docTitles.add(md.documentTitle);
            }
        });

        console.log(`Year ${year}: Found ${count} chunks in sample from titles: ${Array.from(docTitles).join(", ")}`);
    }
}

checkSpecificYears().catch(console.error);
