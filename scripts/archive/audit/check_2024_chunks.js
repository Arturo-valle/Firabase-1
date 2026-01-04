const admin = require("firebase-admin");

if (!admin.apps.length) {
    admin.initializeApp({ projectId: "mvp-nic-market" });
}

const db = admin.firestore();

async function checkNewChunks() {
    console.log("Buscando chunks de AGRICORP AUDITADOS 2024...");

    // Buscar por documentId que contenga 2024
    const snap = await db.collection("documentChunks")
        .where("issuerId", "==", "agri-corp")
        .limit(300)
        .get();

    const chunks2024 = [];
    const chunks2016 = [];
    const otherChunks = [];

    snap.forEach(doc => {
        const data = doc.data();
        const title = data.metadata?.documentTitle || data.documentId || "";

        if (title.includes("2024")) {
            chunks2024.push({ id: doc.id, title });
        } else if (title.includes("2016")) {
            chunks2016.push({ id: doc.id, title });
        } else {
            otherChunks.push({ id: doc.id, title });
        }
    });

    console.log(`\n=== RESULTADOS ===`);
    console.log(`Total chunks encontrados: ${snap.size}`);
    console.log(`Chunks de 2024: ${chunks2024.length}`);
    console.log(`Chunks de 2016: ${chunks2016.length}`);
    console.log(`Otros chunks: ${otherChunks.length}`);

    if (chunks2024.length > 0) {
        console.log(`\nEjemplo chunk 2024: ${chunks2024[0].id}`);
    }

    if (chunks2016.length > 0) {
        console.log(`Ejemplo chunk 2016: ${chunks2016[0].id}`);
    }
}

checkNewChunks().catch(console.error);
