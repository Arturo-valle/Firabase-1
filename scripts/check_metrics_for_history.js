// Script para poblar la subcolecc ión history con datos existentes de issuerMetrics
const axios = require('axios');

const API_BASE_URL = 'https://api-os3qsxfz6q-uc.a.run.app';

const ISSUERS = [
    "agri-corp",
    "banpro",
    "bdf",
    "fama",
    "fdl",
    "fid",
    "horizonte"
];

async function populateHistoryFromMetrics() {
    console.log("🔄 Poblando historia a partir de métricas existentes...\n");

    for (const issuerId of ISSUERS) {
        try {
            // 1. Obtener métricas actuales
            const metricsRes = await axios.get(`${API_BASE_URL}/metrics/${issuerId}`);

            if (!metricsRes.data.success || !metricsRes.data.metrics) {
                console.log(`⚠️ ${issuerId}: Sin métricas actuales`);
                continue;
            }

            const m = metricsRes.data.metrics;
            const periodo = m.metadata?.periodo || m.periodo;

            if (!periodo) {
                console.log(`⚠️ ${issuerId}: Sin periodo definido en métricas`);
                continue;
            }

            // Extraer año del periodo (formato "2024-12-31" o "2024")
            const yearMatch = periodo.match(/\d{4}/);
            if (!yearMatch) {
                console.log(`⚠️ ${issuerId}: No se pudo extraer año de "${periodo}"`);
                continue;
            }

            const year = yearMatch[0];
            const activosTotales = m.capital?.activosTotales || null;
            const ingresosTotales = m.rentabilidad?.ingresosTotales || null;
            const utilidadNeta = m.rentabilidad?.utilidadNeta || null;
            const patrimonio = m.capital?.patrimonio || m.solvencia?.patrimonio || null;

            console.log(`✅ ${issuerId}: Año ${year}`);
            console.log(`   - Activos: ${activosTotales ? activosTotales.toLocaleString() : 'N/D'}`);
            console.log(`   - Ingresos: ${ingresosTotales ? ingresosTotales.toLocaleString() : 'N/D'}`);
            console.log(`   - Utilidad: ${utilidadNeta ? utilidadNeta.toLocaleString() : 'N/D'}`);
            console.log(`   - Patrimonio: ${patrimonio ? patrimonio.toLocaleString() : 'N/D'}`);

        } catch (error) {
            console.error(`❌ ${issuerId}: Error - ${error.message}`);
        }
    }
}

populateHistoryFromMetrics();
