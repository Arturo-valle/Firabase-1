const admin = require('firebase-admin');

// Inicializar Firebase Admin (usando credenciales por defecto del entorno)
if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

async function healMarketData() {
    console.log("🏥 Iniciando Curación de Datos de Mercado...");

    // 1. CORRECCIÓN AGRICORP (Normalización Decimal -> Porcentaje)
    // El ROE de Agricorp se guardó como 0.04 (4%) en lugar de 4.0.
    const agriIds = ['agricorp', 'corporaci-n-agricola'];
    let fixedAgri = false;

    for (const id of agriIds) {
        const docRef = db.collection('issuerMetrics').doc(id);
        const doc = await docRef.get();
        if (doc.exists) {
            const data = doc.data();
            console.log(`[Agricorp] Datos actuales (${id}): ROE = ${data.rentabilidad?.roe}`);

            if (data.rentabilidad && data.rentabilidad.roe !== null && Math.abs(data.rentabilidad.roe) <= 1.0) {
                // Aplicar corrección: Multiplicar por 100
                const newRoe = Number((data.rentabilidad.roe * 100).toFixed(2));

                // También corregir ROA si es necesario
                let newRoa = data.rentabilidad.roa;
                if (newRoa !== null && Math.abs(newRoa) <= 1.0) {
                    newRoa = Number((newRoa * 100).toFixed(2));
                }

                await docRef.update({
                    'rentabilidad.roe': newRoe,
                    'rentabilidad.roa': newRoa,
                    'metadata.nota': (data.metadata?.nota || '') + ' | ROE Normalized x100'
                });
                console.log(`✅ [Agricorp] Corregido: ROE ${data.rentabilidad.roe} -> ${newRoe}%, ROA ${data.rentabilidad.roa} -> ${newRoa}%`);
                fixedAgri = true;
            } else {
                console.log(`[Agricorp] No requiere normalización o datos nulos.`);
            }
        }
    }

    // 2. LIMPIEZA HORIZONTE
    // Detectar duplicados de Horizonte que ensucian la BD y no tienen datos.
    // El ID correcto debería ser 'horizonte' (si tuviera datos), pero hay IDs largos generados por el scraper.
    console.log("\n🧹 Limpiando emisores fantasma de Horizonte...");
    const issuersSnap = await db.collection('issuers').get();

    const horizonteDocs = [];
    issuersSnap.forEach(doc => {
        const name = (doc.data().name || '').toLowerCase();
        if (name.includes('horizonte') || doc.id.includes('horizonte')) {
            horizonteDocs.push(doc);
        }
    });

    console.log(`Encontrados ${horizonteDocs.length} registros de Horizonte.`);

    for (const doc of horizonteDocs) {
        const data = doc.data();
        const docsCount = (data.documents || []).length;

        console.log(`- ID: ${doc.id} | Docs: ${docsCount} | Processed: ${data.documentsProcessed || 0}`);

        // Si es un ID largo/feo y no tiene documentos, proponer borrarlo o marcarlo inactivo
        // Para ser seguros, solo marcamos inactivo los duplicados vacíos
        if (docsCount === 0 && doc.id.length > 20) {
            // Solo loguear, no borrar sin permiso explícito, pero podríamos limpiar la 'lista'.
            console.log("  ⚠️ Candidato a limpieza (ID largo sin documentos)");
            // await doc.ref.delete(); // Descomentar para acción destructiva
        }
    }

    // 3. FAMA - Reporte de Estado
    console.log("\n🔍 Estado FAMA:");
    const famadoc = await db.collection('issuerMetrics').doc('fama').get();
    if (famadoc.exists) {
        console.log(`FAMA Metrics: ROE=${famadoc.data().rentabilidad?.roe}`);
    } else {
        console.log("FAMA Metrics: No existe documento en issuerMetrics.");
    }

    console.log("\n🏁 Proceso de curación finalizado.");
}

healMarketData().catch(console.error);
