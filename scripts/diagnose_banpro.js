const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize with default credentials (likely available in this environment)
initializeApp();
const db = getFirestore();

async function checkBanproChunks() {
    console.log("🔍 Buscando fragmentos de Banpro...");
    const snapshot = await db.collection('documentChunks')
        .where('issuerId', '==', 'banpro')
        .orderBy('createdAt', 'desc')
        .limit(20)
        .get();

    if (snapshot.empty) {
        console.log("❌ No se encontraron fragmentos.");
        return;
    }

    snapshot.docs.forEach((doc, i) => {
        const data = doc.data();
        console.log(`\n--- CHUNK ${i} (${data.metadata?.title || 'Sin Título'}) ---`);
        console.log(data.text.substring(0, 1000));
        if (data.text.toLowerCase().includes('roa') || data.text.toLowerCase().includes('activos')) {
            console.log("\n>>> POTENCIAL DATO ENCONTRADO <<<");
            const match = data.text.match(/ROA[:\s]+(\d+\.?\d*)/i);
            if (match) console.log("MATCH ROA:", match[0]);
        }
    });
}

checkBanproChunks();
