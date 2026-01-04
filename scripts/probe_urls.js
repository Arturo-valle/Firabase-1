const axios = require('axios');

const PROJECT_HASH = 'os3qsxfz6q';
const REGION = 'uc'; // us-central1 usually 'uc' in run URLs? Or 'us-central1'. 
// In verify_prod.js: 'https://api-os3qsxfz6q-uc.a.run.app' -> 'uc' is likely Region Code.
// Common format: SERVICE-PROJECTHASH-REGIONCODE.a.run.app

const CANDIDATES = [
    `https://manualsynctask-${PROJECT_HASH}-${REGION}.a.run.app`,
    `https://manual-sync-task-${PROJECT_HASH}-${REGION}.a.run.app`,
    `https://manualSyncTask-${PROJECT_HASH}-${REGION}.a.run.app`,
    // Sometimes function name is just the name if pushed differently? No, usually hash.
    // Try api base + path just in case (though index.js suggests separate function)
    `https://api-${PROJECT_HASH}-${REGION}.a.run.app/manualSyncTask`,
    `https://api-${PROJECT_HASH}-${REGION}.a.run.app/manualsynctask`
];

async function probe() {
    console.log("Probing URLs...");
    for (const url of CANDIDATES) {
        try {
            console.log(`Checking ${url}...`);
            // Use POST as it's a trigger, but GET is fine to check existence (might 405 or execute)
            const res = await axios.get(url, { timeout: 3000, validateStatus: () => true });
            console.log(`[${res.status}] ${url}`);
            if (res.status === 200) {
                console.log("!!! FOUND IT !!!");
                console.log("Response:", res.data);
                process.exit(0);
            }
            if (res.status !== 404) {
                console.log("!!! POTENTIAL MATCH !!! (Not 404)");
            }
        } catch (e) {
            console.log(`[ERROR] ${url}: ${e.message}`);
        }
    }
}

probe();
