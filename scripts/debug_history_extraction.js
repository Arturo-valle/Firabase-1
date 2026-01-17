const admin = require('firebase-admin');

// Set project ID explicitly
process.env.GCLOUD_PROJECT = 'mvp-nic-market';

// Initialize
if (!admin.apps.length) {
    admin.initializeApp({
        projectId: "mvp-nic-market"
    });
}

// Mock functions.logger to avoid error
global.functions = {
    logger: {
        info: console.log,
        warn: console.warn,
        error: console.error
    }
};
// Also mock require('firebase-functions') if needed by the module
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function (path) {
    if (path === 'firebase-functions') {
        return global.functions;
    }
    return originalRequire.apply(this, arguments);
};

const { extractHistoricalMetrics } = require('../functions/src/services/metrics/historyService');

async function run() {
    console.log("🚀 Starting History Extraction Debug for 'agricorp'...");
    try {
        const result = await extractHistoricalMetrics('agricorp', 'Corporación Agrícola S.A.');
        console.log("✅ Result:", JSON.stringify(result, null, 2));
    } catch (e) {
        console.error("❌ Error:", e);
    }
    process.exit(0);
}

run();
