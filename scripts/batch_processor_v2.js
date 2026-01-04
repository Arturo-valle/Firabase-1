const https = require('https');

const API_BASE = 'https://api-os3qsxfz6q-uc.a.run.app';

const TARGETS = [
    "agri-corp",
    "banco-de-la-producci-n",
    "banco-de-finanzas",
    "fama",
    "financiera-fdl",
    "fid-sociedad-an-nima",
    "horizonte-fondo-de-inversi-n-financiero-de-crecimiento-d-lares-no-diversificado"
];

async function processUntilDone(id) {
    let more = true;
    let cycles = 0;
    const MAX_CYCLES = 20; // Safety limit (20 * 10 = 200 docs)

    console.log(`\n🚀 Starting intensive processing for: ${id}`);

    while (more && cycles < MAX_CYCLES) {
        cycles++;
        console.log(`   [${id}] Cycle ${cycles}: Processing batch of 10 docs...`);

        try {
            const result = await triggerBatch(id, 10);
            if (!result || result.unprocessedCount === 0) {
                console.log(`   [${id}] ✅ Finished! No more unprocessed documents.`);
                more = false;
            } else {
                console.log(`   [${id}] ⏳ Progress: ${result.processedCount} docs processed in this batch. Remaining unprocessed: ${result.unprocessedCount}`);
                // Small pause to let the system breathe
                await new Promise(r => setTimeout(r, 2000));
            }
        } catch (e) {
            console.error(`   [${id}] ❌ Error in cycle ${cycles}: ${e.message}`);
            more = false;
        }
    }
}

async function triggerBatch(id, max) {
    return new Promise((resolve, reject) => {
        const url = `${API_BASE}/process/${id}?max=${max}`;
        const options = { method: 'POST', timeout: 300000 }; // 5 mins

        const req = https.request(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        const json = JSON.parse(data);
                        resolve(json.result);
                    } catch (e) { reject(new Error("Invalid JSON response")); }
                } else {
                    reject(new Error(`Status ${res.statusCode}: ${data.substring(0, 100)}`));
                }
            });
        });

        req.on('error', e => reject(e));
        req.end();
    });
}

async function run() {
    console.log("🔥 Starting Global Batch Processing V2 (Safe Mode) 🔥");
    for (const id of TARGETS) {
        await processUntilDone(id);
    }
    console.log("\n🏁 ALL TARGETS PROCESSED 🏁");
}

run();
