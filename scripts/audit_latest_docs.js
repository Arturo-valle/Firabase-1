const admin = require('firebase-admin');

// Set project ID explicitly
process.env.GCLOUD_PROJECT = 'mvp-nic-market';

if (!admin.apps.length) {
    admin.initializeApp({ projectId: "mvp-nic-market" });
}
const db = admin.firestore();

const ISSUERS = ["agricorp", "banpro", "bdf", "fama", "fdl", "fid", "horizonte"];

async function checkLatestDocs() {
    console.log("🔍 AUDITORÍA DE ACTUALIDAD DOCUMENTAL (Todos los emisores activos)");
    console.log("----------------------------------------------------------------");

    for (const issuerId of ISSUERS) {
        // 1. Check Issuer Metadata
        const issuerDoc = await db.collection('issuers').doc(issuerId).get();
        if (!issuerDoc.exists) {
            console.log(`❌ [${issuerId.toUpperCase()}] No existe en la colección 'issuers'.`);
            continue;
        }

        const data = issuerDoc.data();
        const docs = data.documents || [];

        if (docs.length === 0) {
            console.log(`⚠️ [${issuerId.toUpperCase()}] 0 documentos registrados.`);
            continue;
        }

        // Sort by date manually to be sure
        const validDocs = docs.map(d => {
            let dateVal = d.date ? new Date(d.date) : new Date(0);
            if (isNaN(dateVal.getTime())) dateVal = new Date(0);
            return { ...d, dateObj: dateVal };
        }).sort((a, b) => b.dateObj - a.dateObj);

        const latest = validDocs[0];
        const latestYear = latest.dateObj.getFullYear();

        const statusIcon = latestYear >= 2024 ? "✅" : (latestYear >= 2023 ? "⚠️" : "❌");

        console.log(`${statusIcon} [${issuerId.toUpperCase()}]`);
        console.log(`   Total Docs: ${docs.length}`);
        console.log(`   Último Doc: ${latest.title}`);
        console.log(`   Fecha:      ${latest.date} (${latestYear})`);
        console.log(`   URL:        ${latest.url}`);
        console.log("");
    }
    process.exit(0);
}

checkLatestDocs().catch(console.error);
