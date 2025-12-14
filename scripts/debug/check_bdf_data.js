const admin = require('firebase-admin');

admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'mvp-nic-market'
});

const db = admin.firestore();

async function checkBDFData() {
    console.log("Checking document chunks for issuer: bdf...");

    // Query for all chunks for 'bdf'
    // Query for chunks that might contain 2024/2025 references
    // Note: 'text' field cannot be queried with substring in Firestore directly unless using Algolia/etc.
    // relying on fetching more and filtering in memory, or checking 'metadata.documentTitle'.

    console.log("Fetching up to 2000 chunks to scan for 2024/2025...");
    const snapshot = await db.collection('documentChunks')
        .where('issuerId', '==', 'bdf')
        .orderBy('createdAt', 'desc')
        .limit(2000)
        .get();

    if (snapshot.empty) {
        console.log("No chunks found for 'bdf'.");
        return;
    }

    // FILTER IN MEMORY FOR 2024/2025
    const recentChunks = snapshot.docs.filter(doc => {
        const data = doc.data();
        const text = data.text || "";
        const title = data.metadata?.documentTitle || "";
        return title.includes("2024") || title.includes("2025") || text.includes("2024") || text.includes("2025");
    });

    console.log(`\nFound ${recentChunks.length} chunks potentially related to 2024/2025.`);

    if (recentChunks.length > 0) {
        console.log("\n--- RECENT DATA PREVIEW (First 3 Matching) ---");
        recentChunks.slice(0, 3).forEach((doc, index) => {
            console.log(`\nMatch ${index + 1}:`, JSON.stringify(doc.data().metadata, null, 2));
        });
    }

    // Continue with stats but use recentChunks if any, otherwise all
    const chunksToAnalyze = recentChunks.length > 0 ? recentChunks : snapshot.docs;

    snapshot.docs.slice(0, 0).forEach((doc, index) => { }); // Clear previous dump

    const documents = {};

    chunksToAnalyze.forEach(doc => {
        const data = doc.data();
        const docName = data.metadata?.documentTitle || "Unknown Document"; // FIXED FIELD NAME

        if (!documents[docName]) {
            documents[docName] = {
                count: 0,
                dates: new Set(),
                isAudited: data.metadata?.isAudited || false,
                isFinancial: data.metadata?.isFinancial || false,
                sampleText: data.text ? data.text.substring(0, 100) : "No text"
            };
        }
        documents[docName].count++;
        if (data.metadata?.date) documents[docName].dates.add(data.metadata.date);
    });

    console.log("\n--- Unique Documents Found ---");
    Object.keys(documents).forEach(docName => {
        const doc = documents[docName];
        console.log(`\nDocument: ${docName}`);
        console.log(`  - Chunks: ${doc.count}`);
        console.log(`  - Detected Dates: ${Array.from(doc.dates).join(", ")}`);
        console.log(`  - Flags: Audited=${doc.isAudited}, Financial=${doc.isFinancial}`);
        console.log(`  - Preview: ${doc.sampleText.replace(/\n/g, ' ')}`);

        // Specific check for 2024 keywords
        const is2024 = docName.includes('2024') || Array.from(doc.dates).some(d => d.includes('2024'));
        const isFinancialTitle = docName.toLowerCase().includes('estados financieros');

        if (is2024 && isFinancialTitle) {
            console.log("  >>> POTENTIAL TARGET: Matches '2024' and 'Estados Financieros'");
        }
    });
}

checkBDFData().catch(console.error);
