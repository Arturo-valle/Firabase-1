const https = require('https');

const API_BASE = 'https://us-central1-mvp-nic-market.cloudfunctions.net/api';

// IDs OFICIALES verificados en vivo desde el endpoint /issuers
const ISSUERS = [
    "agri-corp",
    "banpro",
    "bdf",
    "fama",
    "fdl",
    "fid",
    "horizonte"
];

/**
 * Dispara la extracción para un emisor específico
 */
async function triggerExtraction(id) {
    return new Promise((resolve) => {
        console.log(`\n⏳ Procesando emisor: ${id}...`);
        const url = `${API_BASE}/metrics/extract/${id}`;

        const options = {
            method: 'POST',
            timeout: 600000 // 10 minutos
        };

        const req = https.request(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    console.log(`   ✅ ÉXITO [${id}]: Métricas actualizadas.`);
                } else {
                    console.log(`   ❌ ERROR [${id}]: Status ${res.statusCode} - ${data.substring(0, 200)}`);
                }
                resolve();
            });
        });

        req.on('error', (e) => {
            console.log(`   ❌ ERROR DE CONEXIÓN [${id}]: ${e.message}`);
            resolve();
        });

        req.end();
    });
}

/**
 * Función principal
 */
async function run() {
    console.log("🚀 INICIANDO REGENERACIÓN MASIVA (GEMINI 3 FLASH)...");
    console.log("Estrategia: Secuencial con delay de 10s para máxima estabilidad.");
    console.log("--------------------------------------------------");

    const startTime = Date.now();

    for (const id of ISSUERS) {
        await triggerExtraction(id);
        console.log(`   😴 Esperando 15 segundos para enfriamiento de cuota...`);
        await new Promise(resolve => setTimeout(resolve, 15000));
    }

    const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(2);
    console.log("\n--------------------------------------------------");
    console.log(`✨ PROCESO COMPLETADO en ${duration} minutos.`);
    console.log("Verifica los resultados en Firestore (colección 'issuerMetrics').");
}

run();
