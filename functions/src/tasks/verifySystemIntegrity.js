const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const { loadRemoteConfig } = require('../utils/issuerConfig');

/**
 * Script de Verificación de Integridad del Sistema BVN AI
 * Audita la consistencia entre:
 * 1. Configuración (Issuers)
 * 2. Documentos Procesados (DocumentChunks)
 * 3. Métricas del Dashboard (IssuerMetrics)
 * 4. Métricas Verificadas RAG (FinancialMetrics)
 */
async function verifySystemIntegrity() {
    console.log('🔍 Iniciando Auditoría de Integridad del Sistema...\n');

    if (!admin.apps.length) {
        admin.initializeApp();
    }

    const db = getFirestore();
    const config = await loadRemoteConfig();
    const report = {
        issuers: {},
        globalHealth: 'UNKNOWN',
        warnings: [],
        errors: []
    };

    console.log(`📋 Configuración cargada. Evaluando ${config.WHITELIST.length} emisores en Whitelist: ${config.WHITELIST.join(', ')}\n`);

    for (const issuerId of config.WHITELIST) {
        process.stdout.write(`Evaluando ${issuerId}... `);
        const stats = {
            hasConfig: false,
            chunksCount: 0,
            dashboardMetrics: false,
            ragMetricsYears: [],
            lastSync: null
        };

        // 1. Check Issuer Core Config
        const issuerDoc = await db.collection('issuers').doc(issuerId).get();
        if (issuerDoc.exists) {
            stats.hasConfig = true;
            stats.lastSync = issuerDoc.data().lastSync?.toDate().toISOString() || 'N/A';
        } else {
            report.errors.push(`[${issuerId}] No existe documento maestro en colección 'issuers'.`);
        }

        // 2. Check Chunks (Vector DB Coverage)
        const chunksSnapshot = await db.collection('documentChunks')
            .where('issuerId', '==', issuerId)
            .count()
            .get();
        stats.chunksCount = chunksSnapshot.data().count;

        if (stats.chunksCount === 0) {
            report.warnings.push(`[${issuerId}] Sin chunks vectorizados (0 documentos procesados).`);
        }

        // 3. Check Dashboard Metrics (issuerMetrics)
        const metricsDoc = await db.collection('issuerMetrics').doc(issuerId).get();
        if (metricsDoc.exists) {
            stats.dashboardMetrics = true;
            const historySnap = await db.collection('issuerMetrics').doc(issuerId).collection('history').get();
            stats.historyYears = historySnap.docs.map(d => d.id).sort();
        } else {
            report.warnings.push(`[${issuerId}] Sin métricas para Dashboard (issuerMetrics).`);
        }

        // 4. Check RAG Verified Metrics (financialMetrics)
        // Check for recent years
        const recentYears = ['2023', '2024', '2025'];
        for (const year of recentYears) {
            const finDoc = await db.collection('financialMetrics').doc(`${issuerId}_${year}`).get();
            if (finDoc.exists) {
                stats.ragMetricsYears.push(year);
            }
        }

        report.issuers[issuerId] = stats;
        console.log(`OK. (Chunks: ${stats.chunksCount} | Dashboard: ${stats.dashboardMetrics ? 'YES' : 'NO'} | RAG Years: ${stats.ragMetricsYears.join(',') || 'NONE'})`);
    }

    // Análisis Final
    console.log('\n--- RESUMEN DE INTEGRIDAD ---');
    const totalErrors = report.errors.length;
    const totalWarnings = report.warnings.length;

    if (totalErrors > 0) {
        report.globalHealth = 'CRITICAL';
        console.log(`❌ ESTADO CRÍTICO: ${totalErrors} errores encontrados.`);
        report.errors.forEach(e => console.log(`   - ${e}`));
    } else if (totalWarnings > 0) {
        report.globalHealth = 'DEGRADED';
        console.log(`⚠️ ESTADO DEGRADADO: ${totalWarnings} advertencias encontradas.`);
        report.warnings.forEach(w => console.log(`   - ${w}`));
    } else {
        report.globalHealth = 'HEALTHY';
        console.log(`✅ ESTADO SALUDABLE: Todos los emisores tienen datos sincronizados.`);
    }

    return report;
}

if (require.main === module) {
    verifySystemIntegrity()
        .then(() => process.exit(0))
        .catch(e => {
            console.error(e);
            process.exit(1);
        });
}

module.exports = verifySystemIntegrity;
