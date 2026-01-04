const admin = require('firebase-admin');
const { syncIssuers } = require('../functions/src/tasks/syncIssuers');

// Initialize Admin if not already
if (!admin.apps.length) {
    admin.initializeApp({
        projectId: 'mvp-nic-market'
    });
}

(async () => {
    console.log("TRIGGERING MANUAL SYNC...");
    try {
        await syncIssuers();
        console.log("MANUAL SYNC COMPLETE.");
    } catch (e) {
        console.error("SYNC FAILED:", e);
    }
})();
