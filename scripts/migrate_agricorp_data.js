const admin = require('firebase-admin');

// Initialize with default credentials
admin.initializeApp();

const db = admin.firestore();

async function migrateAgricorpData() {
    console.log('Iniciando migración de datos de agri-corp a agricorp...');

    const sourceId = 'agri-corp';
    const targetId = 'agricorp';

    try {
        // 1. Migrar documento principal de métricas
        const sourceDoc = await db.collection('issuerMetrics').doc(sourceId).get();
        if (!sourceDoc.exists) {
            console.log(`No se encontró el documento origen: ${sourceId}`);
            return;
        }

        const sourceData = sourceDoc.data();
        console.log('Datos encontrados en origen:', Object.keys(sourceData));

        // Escribir en destino (merge para no borrar nada existente que sea útil)
        await db.collection('issuerMetrics').doc(targetId).set({
            ...sourceData,
            issuerId: targetId, // Actualizar ID
            migratedAt: new Date()
        }, { merge: true });

        console.log(`Documento principal copiado a ${targetId}`);

        // 2. Migrar subcolección 'history'
        const historySnap = await db.collection('issuerMetrics').doc(sourceId).collection('history').get();

        if (historySnap.empty) {
            console.log('No hay historia para migrar.');
        } else {
            console.log(`Migrando ${historySnap.size} documentos de historia...`);
            const batch = db.batch();
            const targetHistoryRef = db.collection('issuerMetrics').doc(targetId).collection('history');

            historySnap.forEach(doc => {
                const data = doc.data();
                if (data.activosTotales || data.utilidadNeta || data.ingresosTotales) {
                    batch.set(targetHistoryRef.doc(doc.id), data, { merge: true });
                }
            });

            await batch.commit();
            console.log('Historia migrada exitosamente.');
        }

        console.log('Migración completada.');

    } catch (error) {
        console.error('Error durante la migración:', error);
    }
}

migrateAgricorpData();
