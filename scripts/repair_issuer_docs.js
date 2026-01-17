const admin = require('firebase-admin');
const { processIssuerDocuments } = require('../functions/src/services/documentProcessor');

// Initialize Admin SDK for local usage
if (!admin.apps.length) {
    admin.initializeApp({
        projectId: 'mvp-nic-market',
        storageBucket: 'mvp-nic-market.firebasestorage.app'
    });
}

const db = admin.firestore();

async function repair(issuerId, maxDocs = 5) {
    console.log(`\n🚀 Starting Document Repair for: ${issuerId} (Max: ${maxDocs})`);

    try {
        const issuerDoc = await db.collection('issuers').doc(issuerId).get();
        if (!issuerDoc.exists) {
            console.error(`❌ Issuer ${issuerId} not found.`);
            return;
        }

        const issuerData = issuerDoc.data();
        const documents = issuerData.documents || [];

        console.log(`Found ${documents.length} documents registered.`);

        // Call the service directly
        const stats = await processIssuerDocuments(issuerId, issuerData.name, documents, maxDocs);

        console.log(`\n--- Repair Stats for ${issuerId} ---`);
        console.log(`Processed: ${stats.processedCount}`);
        console.log(`Errors: ${stats.errorCount}`);
        console.log(`Unprocessed Remaining: ${stats.unprocessedCount}`);

        if (stats.debugInfo) {
            console.log("\nDebug Info (Top 5):");
            stats.debugInfo.slice(0, 5).forEach(info => {
                if (info.error) console.log(`  ❌ [${info.title}]: ${info.error}`);
                else console.log(`  ✅ [${info.title}]: ${info.chunksCount} chunks, SmartStatus: ${info.smartStatus}`);
            });
        }

    } catch (error) {
        console.error(`💥 Fatal error repairing ${issuerId}:`, error);
    }
}

// Target all missing issuers
async function repairAll() {
    const MISSING = ['banpro', 'fdl', 'fid', 'horizonte'];
    for (const id of MISSING) {
        await repair(id, 6); // 6 docs each
    }
}

repairAll().then(() => {
    console.log("\nGlobal Repair Done.");
    process.exit(0);
});
