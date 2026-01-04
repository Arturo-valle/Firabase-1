const admin = require('firebase-admin');

// Inicializar Firebase Admin usando credenciales del entorno (ADC)
if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

async function auditHorizonte() {
    console.log("=== AUDITORÍA PROFUNDA DE HORIZONTE ===");

    // 1. Buscar el ID correcto de Horizonte
    // A veces el ID es 'horizonte' y otras veces es un slug largo
    const candidates = [
        'horizonte',
        'horizonte-fondo-de-inversi-n',
        'horizonte-fondo-de-inversi-n-financiero-de-crecimiento-d-lares-no-diversificado'
    ];

    let issuerDoc = null;
    let finalId = '';

    for (const id of candidates) {
        const doc = await db.collection('issuers').doc(id).get();
        if (doc.exists) {
            console.log(`✅ Emisor encontrado con ID: "${id}"`);
            issuerDoc = doc.data();
            finalId = id;
            break;
        }
    }

    if (!issuerDoc) {
        console.error("❌ CRÍTICO: No se encontró el emisor Horizonte en la colección 'issuers'.");
        console.log("Posible Causa: El scraper no lo incluyó o tiene un ID totalmente diferente.");

        // Búsqueda por nombre si falla ID
        console.log("Intentando búsqueda por nombre...");
        const snapshot = await db.collection('issuers')
            .where('name', '>=', 'Horizonte')
            .where('name', '<=', 'Horizonte\uf8ff')
            .get();

        if (snapshot.empty) {
            console.error("❌ Definitivamente no existe en BD.");
            return;
        } else {
            snapshot.forEach(d => console.log(`Encontrado por nombre: ID=${d.id}, Name=${d.data().name}`));
        }
        return;
    }

    // 2. Analizar Documentos
    const docs = issuerDoc.documents || [];
    console.log(`\n📄 Documentos Indexados: ${docs.length}`);

    if (docs.length === 0) {
        console.error("❌ CRÍTICO: El emisor existe pero NO TIENE DOCUMENTOS asociados.");
        console.log(`URL Fuente registrada: ${issuerDoc.detailUrl}`);
        console.log("Acción requerida: Verificar scraper y URL fuente.");
        return;
    }

    // Listar últimos 5 documentos
    console.log("--- Muestra de Documentos Recientes ---");
    docs.slice(0, 5).forEach(d => {
        console.log(`- [${d.date}] ${d.title} (${d.type})`);
        console.log(`  Url: ${d.url}`);
    });

    // 3. Verificar Chunks (Texto procesado)
    console.log(`\n🧩 Verificando Chunks de Texto para ID: ${finalId}`);
    const chunkSnapshot = await db.collection('documentChunks')
        .where('issuerId', '==', finalId)
        .limit(5)
        .get();

    console.log(`Chunks encontrados (limit 5): ${chunkSnapshot.size}`);

    if (chunkSnapshot.empty) {
        console.error("❌ CRÍTICO: Hay documentos pero NO HAY CHUNKS DE TEXTO.");
        console.log("Causa: El proceso de 'documentProcessor' no corrió o falló al descargar/leer los PDFs.");
        return;
    }

    // 4. Analizar contenido del texto
    console.log("\n--- Contenido de Texto (Muestra) ---");
    chunkSnapshot.forEach(doc => {
        const text = doc.data().text || "";
        console.log(`Chunk ID: ${doc.id} (${text.length} chars)`);
        console.log(`Snippet: ${text.substring(0, 150)}...`);

        // Buscar palabras clave financieras
        const keywords = ['activo', 'pasivo', 'patrimonio', 'roe', 'ganancia', 'pérdida'];
        const found = keywords.filter(k => text.toLowerCase().includes(k));
        console.log(`Palabras clave financieras detectadas: [${found.join(', ')}]`);
        console.log("---");
    });

    // 5. Verificar métricas existentes
    const metricsDoc = await db.collection('issuerMetrics').doc(finalId).get();
    if (metricsDoc.exists) {
        console.log("\n📊 Métricas actuales en BD:");
        console.log(JSON.stringify(metricsDoc.data(), null, 2));
    } else {
        console.log(`\n❌ No existe documento de métricas en 'issuerMetrics' para ${finalId}`);
    }
}

auditHorizonte().catch(console.error);
