const axios = require('axios');

const API_BASE_URL = 'https://us-central1-mvp-nic-market.cloudfunctions.net/api'; // URL base actualizada

const ISSUERS = [
    "agri-corp",
    "banpro",
    "bdf",
    "fama",
    "fdl",
    "fid",
    "horizonte"
];

async function reextractAll() {
    console.log(`🚀 Iniciando re-extracción integral para ${ISSUERS.length} emisores...`);

    const results = [];

    for (const issuerId of ISSUERS) {
        console.log(`\n--- Procesando: ${issuerId.toUpperCase()} ---`);
        try {
            // Llamada al endpoint de extracción de historia
            const response = await axios.post(`${API_BASE_URL}/metrics/history/extract/${issuerId}`);

            if (response.data.success) {
                console.log(`✅ ÉXITO: ${issuerId}. Puntos extraídos: ${response.data.count}`);
                results.push({ id: issuerId, status: 'success', count: response.data.count });
            } else {
                console.warn(`⚠️ ADVERTENCIA: ${issuerId} reportó fallo.`);
                results.push({ id: issuerId, status: 'partial_fail', error: response.data.error });
            }
        } catch (error) {
            console.error(`❌ ERROR en ${issuerId}:`, error.message);
            results.push({ id: issuerId, status: 'error', error: error.message });
        }

        // Timeout para evitar rate limiting de IA si la cola está muy llena
        console.log("Esperando 3 segundos para el próximo emisor...");
        await new Promise(r => setTimeout(r, 3000));
    }

    console.log("\n" + "=".repeat(30));
    console.log("🏁 RESUMEN FINAL DE RE-EXTRACCIÓN:");
    console.table(results);
    console.log("=".repeat(30));
}

reextractAll();
