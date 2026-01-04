const admin = require('firebase-admin');
const { generateFinancialAnalysis: callVertexAI, AI_CONFIG } = require('../functions/src/services/vertexAI');
const { HISTORICAL_METRICS_SCHEMA } = require('../functions/src/services/aiSchemas');
const { WHITELIST, EXTRACTION_MAPPING } = require('../functions/src/utils/issuerConfig');

// FORCE PROD
process.env.GCLOUD_PROJECT = 'mvp-nic-market';
delete process.env.FIRESTORE_EMULATOR_HOST;

if (!admin.apps.length) {
    admin.initializeApp({
        projectId: "mvp-nic-market"
    });
}

const db = admin.firestore();

async function run() {
    console.log("🚀 Starting ROBUST Local History Extraction...");

    // 1. Verify Connection
    try {
        const testDoc = await db.collection('issuers').doc('agricorp').get();
        if (!testDoc.exists) {
            console.error("❌ CONNECTIVITY CHECK FAILED: Valid issuer 'agricorp' not found. Check auth/project.");
            process.exit(1);
        }
        console.log(`✅ Connected to ${process.env.GCLOUD_PROJECT}. Found Agricorp.`);
    } catch (e) {
        console.error("❌ CONNECTION ERROR:", e);
        process.exit(1);
    }

    const ISSUERS_TO_PROCESS = WHITELIST; // From config

    for (const issuerId of ISSUERS_TO_PROCESS) {
        console.log(`\n--- Processing ${issuerId} ---`);
        try {
            // Find Source Mapping
            const candidates = EXTRACTION_MAPPING[issuerId] || [issuerId];

            // Find Docs
            const collections = ['documentChunks', 'fact_vectors'];
            let allDocs = [];
            for (const collName of collections) {
                const snap = await db.collection(collName)
                    .where('issuerId', 'in', candidates)
                    .limit(collName === 'fact_vectors' ? 1000 : 1000)
                    .get();
                allDocs = allDocs.concat(snap.docs);
            }

            if (allDocs.length === 0) {
                console.warn(`⚠️ No docs found for ${issuerId}`);
                continue;
            }

            // Build Context
            allDocs.sort((a, b) => b.createTime.seconds - a.createTime.seconds); // Sort by creation
            const selectedChunks = allDocs.slice(0, 100);
            const context = selectedChunks.map(d => `[${d.data().metadata?.documentDate || '?'}] ${d.data().text}`).join('\n\n').substring(0, 500000);

            console.log(`Analyzing ${selectedChunks.length} docs...`);

            const prompt = `
Extract historical financial metrics for ${issuerId} (2021-2025).
RETURN JSON ARRAY ONLY.
KEYS MUST BE: "period" (string year), "activosTotales" (number), "utilidadNeta" (number), "patrimonio" (number).
Context:
${context}
`;

            const history = await callVertexAI(prompt, {
                temperature: 0,
                model: AI_CONFIG.REASONING_MODEL,
                responseSchema: HISTORICAL_METRICS_SCHEMA
            });

            console.log(`AI extracted ${history.length} years. First item keys: ${Object.keys(history[0] || {})}`);

            // Write to Firestore DIRECTLY
            const batch = db.batch();

            for (const point of history) {
                // Normalize keys if AI failed
                const period = point.period || String(point.year);
                if (!period) {
                    console.warn("Skipping item without period:", point);
                    continue;
                }

                const activos = point.activosTotales ?? point["Activos Totales"] ?? point.activos;
                const utilidad = point.utilidadNeta ?? point["Utilidad Neta"] ?? point["Utilidad"] ?? point.utilidad;
                const patrimonio = point.patrimonio ?? point["Patrimonio"];

                // Ensure numbers
                const finalPoint = {
                    period: String(period),
                    activosTotales: activos ? Number(activos) : null,
                    utilidadNeta: utilidad ? Number(utilidad) : null,
                    patrimonio: patrimonio ? Number(patrimonio) : null,
                    extractedAt: new Date()
                };

                // Write to canonical ID
                const ref = db.collection('issuerMetrics').doc(issuerId).collection('history').doc(String(period));
                batch.set(ref, finalPoint, { merge: true });
                console.log(`Queued write for ${period}: ${finalPoint.activosTotales}`);
            }

            await batch.commit();
            console.log(`✅ COMMITTED ${issuerId} to DB.`);

        } catch (e) {
            console.error(`❌ Error for ${issuerId}:`, e.message);
        }

        // Wait to avoid quota limits
        await new Promise(r => setTimeout(r, 2000));
    }
    console.log("\nDone.");
    process.exit(0);
}

run();
