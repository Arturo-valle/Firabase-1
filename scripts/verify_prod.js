const axios = require('axios');

const API_BASE = 'https://api-os3qsxfz6q-uc.a.run.app';

async function verifyProduction() {
    console.log(`Checking Production API at ${API_BASE}...`);
    
    // 1. Check System Status
    try {
        const statusRes = await axios.get(`${API_BASE}/status`);
        console.log('✅ System Status:', statusRes.data);
    } catch (e) {
        console.error('❌ System Status Failed:', e.message);
    }

    // 2. Check Metrics for BDF (GET - Cache)
    try {
        console.log('\nFetching Metrics for BDF (GET)...');
        const metricsRes = await axios.get(`${API_BASE}/metrics/bdf`);
        if (metricsRes.data.success) {
            const m = metricsRes.data.metrics;
            console.log('✅ Metrics Found (Cached):');
            console.log(`   - Activos: ${m.capital?.activosTotales}`);
            console.log(`   - Utilidad Neta: ${m.rentabilidad?.utilidadNeta}`);
            console.log(`   - Periodo: ${m.metadata?.periodo}`);
            console.log(`   - Moneda: ${m.metadata?.moneda}`);
        } else {
            console.warn('⚠️ No metrics found (GET). Might need extraction.');
        }
    } catch (e) {
        if (e.response && e.response.status === 404) {
             console.warn('⚠️ Metrics not found (404). This is expected if cache is empty.');
        } else {
            console.error('❌ Metrics GET Failed:', e.message);
        }
    }

    // 3. Trigger Extraction (POST) - This is the real test
    // NOTE: We won't trigger this automatically to avoid costs/time unless user wants, 
    // but the script allows it if we uncomment. 
    // For now, let's just assume if GET works or returns 404 cleanly, the API is up.
    // Actually, let's try to Extract for 'bdf' to prove the fix works Live.
    try {
        console.log('\n🚀 Triggering LIVE Extraction for BDF (POST)... (This calls Vertex AI)');
        const extractRes = await axios.post(`${API_BASE}/metrics/extract/bdf`);
         if (extractRes.data.success) {
            const m = extractRes.data.metrics;
            console.log('✅ LIVE EXTRACTION SUCCESSFUL:');
             console.log(`   - Activos: ${m.capital?.activosTotales}`);
            console.log(`   - Utilidad Neta: ${m.rentabilidad?.utilidadNeta}`);
            console.log(`   - Periodo: ${m.metadata?.periodo}`);
            console.log(`   - Moneda: ${m.metadata?.moneda}`);
        } else {
            console.error('❌ Extraction Failed:', extractRes.data);
        }
    } catch (e) {
         console.error('❌ Extraction POST Failed:', e.message, e.response?.data);
    }
}

verifyProduction();
