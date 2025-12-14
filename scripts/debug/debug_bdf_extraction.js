const admin = require('firebase-admin');
const { extractIssuerMetrics } = require('./functions/src/services/metricsExtractor');

// Handle credentials
let serviceAccount;
try { serviceAccount = require('./functions/serviceAccountKey.json'); } catch (e) { }

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: 'mvp-nic-market'
    });
}

async function debugBDF() {
    console.log("🐛 DEBUGGING BDF EXTRACTION CONTEXT 🐛");
    try {
        // We hacked extractIssuerMetrics to log "CONTEXT PREVIEW", but we want the FULL context here.
        // Since I can't easily modify the function to return context without breaking API,
        // I will rely on the logs it produces (which I can read from the returned promise if I captured stdout, but here I will just run it and watch the terminal).
        // ALSO: I will verify what 'extractIssuerMetrics' returns.

        const metrics = await extractIssuerMetrics('bdf', 'BDF');
        console.log("AI RETURNED:", JSON.stringify(metrics, null, 2));

    } catch (error) {
        console.error("Error:", error);
    }
}

debugBDF();
