const https = require('https');
const API_BASE = 'https://api-os3qsxfz6q-uc.a.run.app';
const ID = "banco-de-la-producci-n";

async function triggerBatch(max) {
    return new Promise((resolve, reject) => {
        const url = `${API_BASE}/process/${ID}?max=${max}`;
        const options = { method: 'POST', timeout: 300000 };
        const req = https.request(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    try { resolve(JSON.parse(data).result); } catch (e) { reject(e); }
                } else { reject(new Error(`Status ${res.statusCode}: ${data}`)); }
            });
        });
        req.on('error', e => reject(e));
        req.end();
    });
}

async function run() {
    console.log(`🚀 Starting TARGETED processing for: ${ID}`);
    for (let i = 1; i <= 20; i++) {
        console.log(`   Cycle ${i}...`);
        try {
            const result = await triggerBatch(10);
            if (!result || result.unprocessedCount === 0) break;
            console.log(`   Progress: ${result.processedCount} docs. Remaining: ${result.unprocessedCount}`);
            await new Promise(r => setTimeout(r, 1000));
        } catch (e) {
            console.error(`   Error: ${e.message}`);
            break;
        }
    }
}
run();
