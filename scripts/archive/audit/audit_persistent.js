const admin = require("firebase-admin");
const fs = require("fs");

if (!admin.apps.length) {
    admin.initializeApp({
        projectId: "mvp-nic-market"
    });
}

const db = admin.firestore();

async function audit() {
    const issuerId = "agri-corp";
    const results = {
        total: 0,
        years: { "2022": 0, "2023": 0, "2024": 0 },
        titles: []
    };

    console.log("Starting query...");
    const snap = await db.collection("documentChunks")
        .where("issuerId", "==", issuerId)
        .limit(2000)
        .get();

    results.total = snap.size;
    console.log(`Found ${snap.size} chunks total for sample.`);

    snap.forEach(doc => {
        const data = doc.data();
        const title = data.metadata?.documentTitle || "Unknown";
        const date = data.metadata?.documentDate || "";

        if (!results.titles.includes(title)) results.titles.push(title);

        if (date.includes("2022") || title.includes("2022")) results.years["2022"]++;
        if (date.includes("2023") || title.includes("2023")) results.years["2023"]++;
        if (date.includes("2024") || title.includes("2024")) results.years["2024"]++;
    });

    fs.writeFileSync("audit_results.json", JSON.stringify(results, null, 2));
    console.log("Audit complete. Results in audit_results.json");
}

audit().catch(err => {
    console.error(err);
    fs.writeFileSync("audit_error.txt", err.stack);
    process.exit(1);
});
