const https = require('https');

const API_BASE = 'https://us-central1-mvp-nic-market.cloudfunctions.net/api';

// IDs that actually have documents according to the audit
const TARGETS = [
    "banco-de-la-producci-n",
    "banco-de-finanzas",
    "fama",
    "agri-corp",
    "financiera-fdl",
    "fid-sociedad-an-nima",
    "horizonte-fondo-de-inversi-n-financiero-de-crecimiento-d-lares-no-diversificado"
];

async function triggerProcess(id) {
    return new Promise((resolve) => {
        const url = `${API_BASE}/process/${id}?max=200`;
        console.log(`⏳ Triggering processing for ${id} (max=200)...`);

        const options = { method: 'POST', timeout: 600000 }; // 10 minutes timeout
        const req = https.request(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log(`   [${id}] Status: ${res.statusCode}`);
                try {
                    const json = JSON.parse(data);
                    console.log(`   [${id}] Result: ${JSON.stringify(json.result || json)}`);
                } catch (e) {
                    console.log(`   [${id}] Raw output: ${data.substring(0, 100)}...`);
                }
                resolve();
            });
        });

        req.on('error', e => {
            console.error(`   [${id}] Error: ${e.message}`);
            resolve();
        });

        req.end();
    });
}

async function run() {
    console.log("🚀 Starting Mass Processing of Documents...");
    for (const id of TARGETS) {
        await triggerProcess(id);
        console.log("   Waiting 5 seconds for next batch...");
        await new Promise(r => setTimeout(r, 5000));
    }
    console.log("🏁 Mass processing triggered.");
}

run();
