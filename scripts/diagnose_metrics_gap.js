/**
 * Script de Diagnóstico Integral para Métricas Faltantes
 * Identifica gaps en el pipeline de datos:
 * 1. Verifica IDs en issuerMetrics
 * 2. Verifica chunks en documentChunks
 * 3. Llama API para regenerar métricas si faltan
 */

const https = require('https');

const API_BASE = 'https://us-central1-mvp-nic-market.cloudfunctions.net/api';

// Los 7 emisores oficiales con sus IDs en el frontend
const OFFICIAL_ISSUERS = [
    { frontendId: 'agri-corp', displayName: 'Agricorp', metricsId: 'agricorp' },
    { frontendId: 'banpro', displayName: 'Banpro', metricsId: 'banpro' },
    { frontendId: 'bdf', displayName: 'BDF', metricsId: 'bdf' },
    { frontendId: 'fama', displayName: 'Financiera FAMA', metricsId: 'fama' },
    { frontendId: 'fdl', displayName: 'Financiera FDL', metricsId: 'financiera-fdl' },
    { frontendId: 'fid', displayName: 'FID', metricsId: 'fid-sociedad-an-nima' },
    { frontendId: 'horizonte', displayName: 'Horizonte', metricsId: 'horizonte' },
];

function fetch(url, method = 'GET') {
    return new Promise((resolve, reject) => {
        const options = {
            method,
            timeout: 30000
        };

        const req = https.request(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(data) });
                } catch (e) {
                    resolve({ status: res.statusCode, data: null, raw: data });
                }
            });
        });

        req.on('error', (e) => reject(e));
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });
        req.end();
    });
}

async function diagnose() {
    console.log('╔══════════════════════════════════════════════════════════════════╗');
    console.log('║    DIAGNÓSTICO INTEGRAL DE MÉTRICAS FINANCIERAS - Firabase-1     ║');
    console.log('╚══════════════════════════════════════════════════════════════════╝\n');

    const results = [];

    for (const issuer of OFFICIAL_ISSUERS) {
        console.log(`\n📊 Analizando: ${issuer.displayName} (${issuer.frontendId})`);
        console.log('─'.repeat(50));

        // 1. Check metrics endpoint - try metricsId first (backend storage ID)
        let metricsResult = await fetch(`${API_BASE}/metrics/${issuer.metricsId}`);
        let metricsId = issuer.metricsId;

        // If not found with metricsId, try frontendId
        if (metricsResult.status === 404) {
            console.log(`  ⚠️ No encontrado con ID: ${issuer.metricsId}, intentando: ${issuer.frontendId}`);
            metricsResult = await fetch(`${API_BASE}/metrics/${issuer.frontendId}`);
            metricsId = issuer.frontendId;
        }

        const hasMetrics = metricsResult.status === 200 && metricsResult.data?.success;

        if (hasMetrics) {
            const m = metricsResult.data.metrics;
            console.log(`  ✅ Métricas encontradas (ID: ${metricsId})`);
            console.log(`     - ROE: ${m.rentabilidad?.roe ?? 'N/D'}`);
            console.log(`     - ROA: ${m.rentabilidad?.roa ?? 'N/D'}`);
            console.log(`     - Margen Neto: ${m.rentabilidad?.margenNeto ?? 'N/D'}`);
            console.log(`     - Rating: ${m.calificacion?.rating ?? 'N/D'}`);
            console.log(`     - Activos: ${m.capital?.activosTotales ?? 'N/D'}`);
            console.log(`     - Chunks Analizados: ${m.chunksAnalyzed ?? 'N/D'}`);
            console.log(`     - Fuente: ${m.metadata?.fuente ?? 'N/D'}`);
            console.log(`     - Período: ${m.metadata?.periodo ?? 'N/D'}`);

            // Check if key metrics are missing
            const hasCriticalData = m.rentabilidad?.roe !== null || m.rentabilidad?.roa !== null;
            if (!hasCriticalData) {
                console.log(`  ⚠️ ALERTA: Métricas críticas (ROE/ROA) son NULL`);
            }

            results.push({
                id: issuer.frontendId,
                name: issuer.displayName,
                hasMetrics: true,
                hasROE: m.rentabilidad?.roe !== null,
                hasROA: m.rentabilidad?.roa !== null,
                hasRating: m.calificacion?.rating !== null,
                metricsId: metricsId,
                needsRegeneration: !hasCriticalData
            });
        } else {
            console.log(`  ❌ Sin métricas (Status: ${metricsResult.status})`);
            console.log(`     Respuesta: ${JSON.stringify(metricsResult.data || metricsResult.raw)}`);

            results.push({
                id: issuer.frontendId,
                name: issuer.displayName,
                hasMetrics: false,
                hasROE: false,
                hasROA: false,
                hasRating: false,
                metricsId: null,
                needsRegeneration: true
            });
        }

        // 2. Check debug/view-text to verify chunks exist
        const chunksResult = await fetch(`${API_BASE}/debug/view-text/${metricsId || issuer.frontendId}`);
        if (chunksResult.status === 200 && chunksResult.data?.success) {
            console.log(`  📦 Chunks disponibles: ${chunksResult.data.chunks?.length || 0}`);
        } else {
            console.log(`  📦 Chunks: No se pudo verificar`);
        }
    }

    // Summary
    console.log('\n\n═══════════════════════════════════════════════════════════════════');
    console.log('                           RESUMEN                                  ');
    console.log('═══════════════════════════════════════════════════════════════════\n');

    const withData = results.filter(r => r.hasMetrics && (r.hasROE || r.hasROA));
    const withoutData = results.filter(r => !r.hasMetrics || (!r.hasROE && !r.hasROA));

    console.log(`✅ Emisores CON datos completos: ${withData.length}`);
    withData.forEach(r => console.log(`   - ${r.name}`));

    console.log(`\n❌ Emisores SIN datos o incompletos: ${withoutData.length}`);
    withoutData.forEach(r => console.log(`   - ${r.name} (Métricas: ${r.hasMetrics ? 'Sí' : 'No'}, ROE: ${r.hasROE ? 'Sí' : 'No'})`));

    console.log('\n\n═══════════════════════════════════════════════════════════════════');
    console.log('                    ACCIONES RECOMENDADAS                           ');
    console.log('═══════════════════════════════════════════════════════════════════\n');

    if (withoutData.length > 0) {
        console.log('Para regenerar métricas faltantes, ejecutar POST en:');
        withoutData.forEach(r => {
            console.log(`  curl -X POST "${API_BASE}/metrics/extract/${r.id}"`);
        });
    } else {
        console.log('✅ Todos los emisores tienen métricas completas!');
    }

    return results;
}

diagnose().catch(console.error);
