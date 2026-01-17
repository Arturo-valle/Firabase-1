const { getFirestore } = require('firebase-admin/firestore');
const admin = require('firebase-admin');

if (admin.apps.length === 0) admin.initializeApp();
const db = getFirestore();

// Import Code under test
const { normalizeIssuerName } = require('../functions/src/utils/normalization');
const { ISSUER_METADATA, WHITELIST, ALIASES } = require('../functions/src/utils/issuerConfig');

async function simulateController() {
    console.log("🚀 Simulating Issuers Controller Logic...");

    // 1. Fetch
    console.log("Fetching issuers...");
    const issuersSnapshot = await db.collection("issuers").get();
    console.log(`Found ${issuersSnapshot.size} raw documents.`);

    const whitelist = WHITELIST;
    const aliasesSet = ALIASES;

    const accepted = [];
    const rejected = [];

    issuersSnapshot.docs.forEach(doc => {
        const issuer = doc.data();
        const rawName = issuer.name || doc.id;
        const normalizedName = normalizeIssuerName(rawName);
        const baseId = aliasesSet[normalizedName] || normalizedName;

        const isWhitelisted = whitelist.includes(baseId);

        if (isWhitelisted) {
            accepted.push({
                id: doc.id,
                rawName,
                normalizedName,
                baseId
            });
        } else {
            rejected.push({
                id: doc.id,
                rawName,
                normalizedName,
                baseId,
                reason: "Not in Whitelist"
            });
        }
    });

    console.log("\n✅ ACCEPTED ISSUERS:");
    accepted.forEach(i => console.log(`   - [${i.baseId}] (from: '${i.rawName}' -> '${i.normalizedName}')`));

    console.log("\n❌ REJECTED ISSUERS:");
    rejected.forEach(i => console.log(`   - [id:${i.id}] Name:'${i.rawName}' -> Norm:'${i.normalizedName}' -> Resolved:'${i.baseId}'`));

    const consolidated = new Set();
    accepted.forEach(i => consolidated.add(i.baseId));

    console.log(`\n📊 FINAL RESULT: ${consolidated.size} Unique Issuers Consolidated`);
    console.log(`   Ids: ${Array.from(consolidated).join(', ')}`);

    // Summary
    console.log(`\nStats: ${accepted.length} Raw Documents Accepted -> Merged into ${consolidated.size} Unique Issuers.`);
}

simulateController().catch(console.error);
