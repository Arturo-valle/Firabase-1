const admin = require('firebase-admin');

// Inicializar Firebase Admin usando credenciales del entorno (ADC)
if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

async function auditFama() {
    console.log("=== AUDITORÍA PROFUNDA DE FAMA (Búsqueda de ROE) ===");

    const finalId = 'fama';

    // 1. Verificar métricas existentes y su origen
    const metricsDoc = await db.collection('issuerMetrics').doc(finalId).get();
    if (metricsDoc.exists) {
        console.log("\n📊 Métricas actuales en BD:");
        const m = metricsDoc.data();
        console.log(`Source ID usado: ${m.sourceId}`);
        console.log(`ROE actual: ${m.rentabilidad?.roe}`);
    }

    // 2. Buscar en Chunks Textuales la palabra "ROE" o "Rentabilidad sobre patrimonio"
    console.log(`\n🧩 Buscando 'ROE' en chunks de texto para ID: ${finalId}`);

    // Solución eficiente: Streaming manual (limitado por Firestore)
    // Buscamos patrones de ROE en los últimos 200 chunks financieros
    const chunkSnapshot = await db.collection('documentChunks')
        .where('issuerId', '==', finalId)
        .orderBy('createdAt', 'desc')
        .limit(200)
        .get();

    console.log(`Analizando ${chunkSnapshot.size} chunks recientes...`);

    let foundRoe = false;

    chunkSnapshot.forEach(doc => {
        const text = (doc.data().text || "").toLowerCase();

        // Patrones de búsqueda
        if (text.includes('roe') || text.includes('rentabilidad sobre') || text.includes('patrimonio promedio')) {
            // Extraer snippet alrededor
            const idx = text.search(/roe|rentabilidad sobre/);
            const snippet = text.substring(Math.max(0, idx - 100), Math.min(text.length, idx + 200)).replace(/\n/g, ' ');

            console.log(`\n[Chunk ${doc.id}] Posible Hallazgo:`);
            console.log(`...${snippet}...`);
            foundRoe = true;
        }
    });

    if (!foundRoe) {
        console.log("\n❌ No se encontró la palabra 'ROE' explícita en los últimos 200 chunks.");
        console.log("Posible Causa: El documento es una imagen escaneada no OCR, o usan otro término.");
    }
}

auditFama().catch(console.error);
