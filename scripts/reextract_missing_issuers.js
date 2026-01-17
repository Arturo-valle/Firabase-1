const admin = require('firebase-admin');
const { extractHistoricalMetrics } = require('../functions/src/services/metrics/historyService'); // Adjust path as needed
admin.initializeApp();

async function reextractMissingIssuers() {
    const missingIssuers = [
        { id: 'fama', name: 'Financiera Fama' },
        { id: 'banpro', name: 'Banco de la Producción' },
        { id: 'fid', name: 'FID' }
    ];

    console.log('--- Iniciando Re-extracción Quirúrgica ---');

    for (const issuer of missingIssuers) {
        console.log(`\nProcesando: ${issuer.name} (${issuer.id})...`);
        try {
            // Forzamos la extracción directa
            // Nota: Esto requiere que existan chunks. Si falla por falta de chunks, lo reportará.
            const history = await extractHistoricalMetrics(issuer.id, issuer.name);

            if (history && history.length > 0) {
                console.log(`✅ Extracción exitosa para ${issuer.id}. Registros: ${history.length}`);
            } else {
                console.warn(`⚠️ Extracción finalizó pero no devolvió registros para ${issuer.id}. Posible falta de documentos.`);
            }
        } catch (error) {
            console.error(`❌ Error procesando ${issuer.id}:`, error.message);
        }
    }

    console.log('\n--- Proceso Finalizado ---');
}

// Mockear funciones si es necesario o ajustar require si historyService tiene dependencias
// Dado que esto corre en local con Node, necesitamos asegurar que las dependencias de historyService
// (como Vertex AI, Firestore) funcionen. admin.initializeApp() cubre Firestore.
// Vertex AI necesitará variables de entorno o credenciales. Asumimos entorno configurado.

reextractMissingIssuers();
