const admin = require("firebase-admin");
const serviceAccount = require("../functions/serviceAccountKey.json");

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

const ISSUERS = [
    "agri-corp",
    "banpro",
    "bdf",
    "fama",
    "fdl",
    "fid",
    "horizonte"
];

const YEARS = ["2020", "2021", "2022", "2023", "2024", "2025"];

async function runAudit() {
    console.log("Starting Global History Audit...");
    console.log("--------------------------------------------------------------------------------------------------");
    console.log("| Issuer ID | Year | Chunks Found | Has History Data? | Assets Value |");
    console.log("|-----------|------|--------------|-------------------|--------------|");

    for (const issuerId of ISSUERS) {
        for (const year of YEARS) {
            // Check documentChunks
            const chunksSnap = await db.collection("documentChunks")
                .where("issuerId", "==", issuerId)
                .get();

            let yearChunks = 0;
            chunksSnap.forEach(doc => {
                const data = doc.data();
                const title = data.metadata?.documentTitle || data.metadata?.title || "";
                const date = data.metadata?.documentDate || data.metadata?.date || "";
                if (title.includes(year) || date.includes(year)) {
                    yearChunks++;
                }
            });

            // Check issuerMetrics history
            const historyDoc = await db.collection("issuerMetrics")
                .doc(issuerId)
                .collection("history")
                .doc(year)
                .get();

            let hasHistory = "❌ No";
            let assets = "N/A";

            if (historyDoc.exists) {
                const data = historyDoc.data();
                if (data.activosTotales !== null && data.activosTotales !== undefined) {
                    hasHistory = "✅ Yes";
                    assets = data.activosTotales;
                } else {
                    hasHistory = "⚠️ Placeholder";
                }
            }

            console.log(`| ${issuerId.padEnd(10)} | ${year} | ${String(yearChunks).padEnd(12)} | ${hasHistory.padEnd(17)} | ${assets} |`);
        }
    }
    console.log("--------------------------------------------------------------------------------------------------");
    process.exit(0);
}

runAudit().catch(err => {
    console.error("Audit failed:", err);
    process.exit(1);
});
