const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

const MAPPING = {
    'agricorp': ['agri-corp', 'corporaci-n-agricola'],
    'banpro': ['banco-de-la-producci-n', 'banco de la produccion'],
    'bdf': ['banco-de-finanzas', 'banco de finanzas'],
    'fdl': ['financiera-fdl', 'financiera fdl'],
    'fid': ['fid-sociedad-an-nima', 'fid s.a'],
    'horizonte': ['horizonte-fondo-de-inversi-n-financiero-de-crecimiento-d-lares-no-diversificado'],
    'fama': ['financiera-fama', 'financiera fama']
};

async function migrateAll() {
    console.log('--- Iniciando Migración Masiva de Emisores ---');

    for (const [targetId, sourceIds] of Object.entries(MAPPING)) {
        console.log(`\nProcesando Target: ${targetId}`);
        let migrated = false;

        for (const sourceId of sourceIds) {
            const sourceDoc = await db.collection('issuerMetrics').doc(sourceId).get();

            if (!sourceDoc.exists) {
                console.log(`  [SKIP] Fuente no encontrada: ${sourceId}`);
                continue;
            }

            console.log(`  [FOUND] Fuente encontrada: ${sourceId}`);

            // 1. Migrar métricas principales
            const sourceData = sourceDoc.data();
            await db.collection('issuerMetrics').doc(targetId).set({
                ...sourceData,
                issuerId: targetId,
                migratedAt: new Date(),
                migrationSource: sourceId
            }, { merge: true });

            // 2. Migrar historial
            const historySnap = await db.collection('issuerMetrics').doc(sourceId).collection('history').get();
            if (!historySnap.empty) {
                console.log(`    Migrando ${historySnap.size} registros históricos...`);
                const batch = db.batch();
                const targetRef = db.collection('issuerMetrics').doc(targetId).collection('history');

                historySnap.forEach(doc => {
                    const data = doc.data();
                    // Filtrar vacíos si es necesario, pero copiaremos todo lo que tenga estructura válida
                    if (data.activosTotales || data.period) {
                        batch.set(targetRef.doc(doc.id), data, { merge: true });
                    }
                });

                await batch.commit();
                console.log(`    -> Historial migrado correctamente.`);
                migrated = true;
            }
        }

        if (!migrated) {
            console.warn(`  [! ALERT] No se encontraron datos fuente para ${targetId}`);
        } else {
            console.log(`  [SUCCESS] ${targetId} actualizado.`);
        }
    }
    console.log('\n--- Migración Finalizada ---');
}

migrateAll();
