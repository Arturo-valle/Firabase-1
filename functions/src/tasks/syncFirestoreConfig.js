const admin = require('firebase-admin');
const { WHITELIST, ALIASES, EXTRACTION_MAPPING, ISSUER_METADATA } = require('../utils/issuerConfig');

/**
 * Script para sincronizar la configuración local de emisores con Firestore.
 * Esto permite que el sistema comience a usar la base de datos como fuente de verdad.
 */
async function syncFirestoreConfig() {
    console.log('🚀 Iniciando sincronización de configuración de emisores a Firestore...');

    if (!admin.apps.length) {
        admin.initializeApp();
    }

    const db = admin.firestore();
    const configRef = db.collection('system_config').doc('issuers');

    // Preparar el objeto para Firestore (aplanar para que sea fácil de editar en consola)
    const configData = {
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        whitelist: WHITELIST,
        aliases: ALIASES,
        extractionMapping: EXTRACTION_MAPPING,
        metadata: ISSUER_METADATA,
        version: "2.0.0"
    };

    try {
        await configRef.set(configData, { merge: true });
        console.log('✅ Configuración sincronizada correctamente en system_config/issuers');

        // También guardar en una colección aparte para históricos si fuese necesario
        await db.collection('system_config_history').add({
            ...configData,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            reason: "Migration from code to dynamic config"
        });

    } catch (error) {
        console.error('❌ Error al sincronizar configuración:', error);
        throw error;
    }
}

if (require.main === module) {
    syncFirestoreConfig()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

module.exports = syncFirestoreConfig;
