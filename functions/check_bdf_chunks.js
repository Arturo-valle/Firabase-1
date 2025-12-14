const { getFirestore } = require("firebase-admin/firestore");
const admin = require("firebase-admin");

if (admin.apps.length === 0) {
    admin.initializeApp();
}
const db = getFirestore();

(async () => {
    console.log("Searching for 2024 chunks for banco-de-finanzas...");
    const snapshot = await db.collection("documentChunks")
        .where("issuerId", "==", "banco-de-finanzas")
        .get(); // Get all (might be large, but needed since we can't regex query)

    let count2024 = 0;
    let countFinancial = 0;

    snapshot.forEach(doc => {
        const data = doc.data();
        const md = data.metadata || {};
        if (md.documentTitle && md.documentTitle.includes("2024")) {
            console.log("Found 2024 doc:", md.documentTitle);
            count2024++;
        }
        if (md.docType === 'FINANCIAL_REPORT' || /financiero|balance/i.test(data.text)) {
            countFinancial++;
        }
    });

    console.log(`Total chunks: ${snapshot.size}`);
    console.log(`2024 chunks: ${count2024}`);
    console.log(`Financial chunks: ${countFinancial}`);
})();
