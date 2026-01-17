const { getFirestore } = require('firebase-admin/firestore');
const { processIssuerDocuments } = require('../services/documentProcessor');
const { extractIssuerMetrics, extractHistoricalMetrics } = require('../services/metricsExtractor');
const functions = require('firebase-functions');

/**
 * Script de backfill masivo para procesar todos los documentos de un emisor
 * @param {string} issuerId - ID del emisor (ej: 'agricorp')
 * @param {number} limit - Límite de documentos (default: Infinity)
 */
async function runBackfill(issuerId, limit = Infinity) {
    const db = getFirestore();

    try {
        console.log(`🚀 Iniciando BACKFILL masivo para: ${issuerId.toUpperCase()}`);
        console.log(`📊 Límite de documentos: ${limit === Infinity ? 'SIN LÍMITE' : limit}`);

        const doc = await db.collection('issuers').doc(issuerId).get();
        if (!doc.exists) {
            console.error(`❌ El emisor ${issuerId} no existe en la base de datos.`);
            return;
        }

        const issuer = doc.data();
        const totalDocsInRegistry = issuer.documents?.length || 0;
        console.log(`📝 Documentos registrados en Firestore: ${totalDocsInRegistry}`);

        // Llamamos al procesador con el límite configurado (o Infinity)
        const result = await processIssuerDocuments(
            issuerId,
            issuer.name,
            issuer.documents || [],
            limit
        );

        console.log(`--- ✅ BACKFILL COMPLETADO ---`);
        console.log(`📄 Procesados con éxito: ${result.processedCount}`);
        console.log(`⚠️ Errores encontrados: ${result.errorCount}`);
        console.log(`🔍 Documentos restantes por procesar: ${result.unprocessedCount}`);

        // Actualizar el documento del emisor con el nuevo conteo real de procesados
        // Nota: processIssuerDocuments ya hace un set con merge, pero aquí forzamos la actualización de tiempos
        await db.collection('issuers').doc(issuerId).update({
            lastBackfillAt: new Date(),
            backfillStatus: 'completed'
        });

        // Disparar extracción de métricas si hubo nuevos documentos
        if (result.processedCount > 0) {
            console.log(`🔄 Actualizando métricas del dashboard para ${issuer.name}...`);
            await extractIssuerMetrics(issuerId, issuer.name).catch(e => console.error('Error en métricas:', e.message));
            await extractHistoricalMetrics(issuerId, issuer.name).catch(e => console.error('Error en histórico:', e.message));
        }

        return result;

    } catch (error) {
        console.error(`❌ Error fatal en backfill para ${issuerId}:`, error);
        throw error;
    }
}

// Permitir ejecución desde línea de comandos si es necesario
if (require.main === module) {
    const args = process.argv.slice(2);
    const id = args[0];
    const lim = args[1] ? parseInt(args[1]) : Infinity;

    if (!id) {
        console.log('Uso: node backfillVectors.js <issuerId> [limit]');
        process.exit(1);
    }

    // Inicializar Firebase Admin si se corre como script independiente
    const admin = require('firebase-admin');
    if (admin.apps.length === 0) {
        admin.initializeApp();
    }

    runBackfill(id, lim)
        .then(() => process.exit(0))
        .catch(err => {
            console.error(err);
            process.exit(1);
        });
}

module.exports = { runBackfill };
