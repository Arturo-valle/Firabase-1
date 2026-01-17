const admin = require('firebase-admin');

// --- SETUP ---
process.env.GCLOUD_PROJECT = 'mvp-nic-market';
if (!admin.apps.length) {
    admin.initializeApp({
        projectId: "mvp-nic-market"
    });
}
const db = admin.firestore();

async function run() {
    console.log("🔍 INSPECTING AGRICORP CHUNKS...");

    // Query for chunks with 'auditados' or 'financieros' in title
    // Note: Firestore doesn't support substring search, so we get recent chunks and filter

    // Get doc chunks from this issuer
    const chunksSnap = await db.collection('documentChunks')
        .where('issuerId', '==', 'agricorp')
        .orderBy('createdAt', 'desc')
        .limit(200)
        .get();

    if (chunksSnap.empty) {
        console.log("❌ No chunks found for Agricorp.");
        process.exit(0);
    }

    console.log(`Found ${chunksSnap.size} recent chunks. Analyzing...`);

    const docsSeen = new Map();

    chunksSnap.docs.forEach(doc => {
        const data = doc.data();
        const title = data.metadata.documentTitle || "Unknown";

        if (!docsSeen.has(title)) {
            docsSeen.set(title, {
                count: 0,
                totalTextLen: 0,
                sampleText: data.text ? data.text.substring(0, 100).replace(/\n/g, ' ') : "N/A",
                date: data.metadata.documentDate
            });
        }

        const stats = docsSeen.get(title);
        stats.count++;
        stats.totalTextLen += (data.text ? data.text.length : 0);
    });

    console.log("\n--- Document Summary (Recent) ---");
    const sortedDocs = Array.from(docsSeen.entries()).sort((a, b) => b[1].count - a[1].count);

    sortedDocs.forEach(([title, stats]) => {
        // Highlight Financial Docs
        const isFinancial = /auditado|financiero|balance/i.test(title);
        const icon = isFinancial ? "💰" : "📄";
        const health = stats.totalTextLen > 1000 ? "✅ OK" : "⚠️ LOW CONTENT";

        console.log(`${icon} [${stats.date}] ${title}`);
        console.log(`   Chunk Count: ${stats.count} | Health: ${health} | Text: "${stats.sampleText}..."`);
    });

    process.exit(0);
}

run();
