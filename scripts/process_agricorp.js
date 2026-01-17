const admin = require('firebase-admin');

// --- SETUP ---
process.env.GCLOUD_PROJECT = 'mvp-nic-market';

// Force 'require' hook for firebase-functions if not present 
// (Shared code often uses functions.logger)
global.functions = {
    logger: {
        info: console.log,
        error: console.error,
        warn: console.warn
    }
};

const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function (path) {
    if (path === 'firebase-functions') {
        return global.functions;
    }
    return originalRequire.apply(this, arguments);
};

if (!admin.apps.length) {
    admin.initializeApp({
        projectId: "mvp-nic-market",
        storageBucket: "mvp-nic-market.firebasestorage.app"
    });
}
const db = admin.firestore();

// --- IMPORTS ---
// Need to point to detailed paths
const { processIssuerDocuments } = require('../functions/src/services/documentProcessor');
const { extractHistoricalMetrics } = require('../functions/src/services/metricsExtractor');

async function run() {
    console.log("🚀 STARTING AGRICORP PROCESSING (2021-2025 Recovery)...");

    const issuerId = "agricorp";
    const issuerName = "Corporación Agrícola S.A.";

    // 1. Get Issuer Config to get updated documents list
    const issuerDoc = await db.collection('issuers').doc(issuerId).get();
    if (!issuerDoc.exists) {
        console.error("❌ Agricorp doc not found.");
        process.exit(1);
    }
    const issuerData = issuerDoc.data();
    let documents = issuerData.documents || [];

    // 2. Filter for Recent Docs (2021-2025) which are priority
    documents = documents.filter(d => {
        const y = new Date(d.date).getFullYear();
        return y >= 2021;
    });

    if (documents.length === 0) {
        console.warn("⚠️ No recent documents found in Firestore to process. Run sync first.");
        process.exit(0);
    }

    console.log(`Found ${documents.length} recent documents in Firestore.`);

    // 3. FORCE PROCESSING (Bypass local cache checks in script if desired)
    // We want to process mostly Financial Statements and Risk Ratings
    // The Processor sorts by priority score.

    // MODIFIED: We will filter existing/processed inside the processor, BUT we pass a flag to ignore cache for recent years
    // Actually, processIssuerDocuments doesn't accept a 'force' flag in the version I have.
    // So I will filter the list passed to it.

    // We want ONLY 2021-2025 documents.
    // And we want to simulate that they are "new" so the processor doesn't skip them.
    // The processor checks database for existing documentId.
    // Tricky: If I can't change processor code, I can't bypass the check easily unless I change document title (bad).

    // WAIT! I can use a different approach. I can delete the existing chunks first? No, risky.
    // I will use a NEW "processAgricorpForced" function inline here that copies logic but skips the check.

    const { processDocument, storeDocumentChunks } = require('../functions/src/services/documentProcessor');
    const { getFirestore } = require('firebase-admin/firestore');

    const MAX_DOCS = 40;
    let processedCount = 0;

    console.log(`\n⚙️ FORCE Processing up to ${MAX_DOCS} documents (Avoiding skipped cached docs)...`);

    // Sort by date manually to prioritize newest
    documents.sort((a, b) => new Date(b.date) - new Date(a.date));

    for (const doc of documents.slice(0, MAX_DOCS)) {
        // Only process Financial Statements and Risk Ratings to save time
        const t = (doc.title || '').toLowerCase();
        const isCritical = t.includes('auditado') || t.includes('financiero') || t.includes('riesgo') || t.includes('trimestral');

        if (!isCritical) continue;

        try {
            console.log(`\n🔨 Force Processing: ${doc.title}...`);
            const result = await processDocument(doc, issuerName, issuerId);

            const chunks = result.chunks || [];
            if (chunks.length > 0) {
                const documentId = doc.title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
                await storeDocumentChunks(issuerId, documentId, chunks);
                processedCount++;
                console.log(`   ✅ Created ${chunks.length} chunks.`);
            } else {
                console.warn(`   ⚠️ No chunks created (OCR failed?).`);
            }
        } catch (e) {
            console.error(`   ❌ Failed: ${e.message}`);
        }
    }

    if (processedCount > 0) {
        console.log("\n🧪 Triggering Historical Metrics Extraction...");
        await extractHistoricalMetrics(issuerId, issuerName);
        console.log("✅ Historical Extraction Triggered.");
    } else {
        console.log("ℹ️ No new documents were processed.");
        // Force extraction anyway 
        console.log("🧪 Force Triggering Historical Metrics Extraction (just in case)...");
        await extractHistoricalMetrics(issuerId, issuerName);
    }

    console.log("✅ DONE.");
    process.exit(0);
}

// run(); // Handled by tool replacement logic wrapper? No, it's a script.
// Wrapper below just closes run function.
const runWrapper = run;
runWrapper();
