const https = require('https');

const API_BASE = 'https://us-central1-mvp-nic-market.cloudfunctions.net/api';

const TASKS = [
    { name: "Regenerar FAMA", url: `${API_BASE}/metrics/extract/fama` },
    { name: "Regenerar Horizonte", url: `${API_BASE}/metrics/extract/horizonte-fondo-de-inversi-n-financiero-de-crecimiento-d-lares-no-diversificado` }
];

async function run() {
    console.log("🚀 Iniciando disparador de correcciones...");

    for (const task of TASKS) {
        console.log(`\n⏳ Ejecutando: ${task.name}...`);
        try {
            // Use fetch if available (Node 18+) or implement simple https post
            // For simplicity in older node envs, using curl via exec might be easier, 
            // but let's try a simple request.

            const options = {
                method: 'POST',
                timeout: 120000 // 2 minutes
            };

            const req = https.request(task.url, options, (res) => {
                console.log(`   Status: ${res.statusCode}`);
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        console.log(`   ✅ Éxito: ${data.substring(0, 100)}...`);
                    } else {
                        console.log(`   ❌ Error: ${data}`);
                    }
                });
            });

            req.on('error', (e) => {
                console.log(`   ❌ Error de conexión: ${e.message}`);
            });

            req.end();

            // Wait a bit between requests
            await new Promise(r => setTimeout(r, 2000));

        } catch (e) {
            console.error(e);
        }
    }
}

run();
