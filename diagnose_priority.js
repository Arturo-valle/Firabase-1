const admin = require('firebase-admin');
if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

async function diagnose(issuerId) {
    console.log(`--- Diagnostics for ${issuerId} ---`);
    const doc = await db.collection('issuers').doc(issuerId).get();
    if (!doc.exists) return console.log("Issuer not found");

    const documents = doc.data().documents || [];
    console.log(`Total Docs: ${documents.length}`);

    const scoredDocs = documents.map(doc => {
        const type = (doc.type || '').toLowerCase();
        const title = (doc.title || '').toLowerCase();
        const combined = `${type} ${title}`;
        let score = 0;
        if (combined.includes('auditado') && combined.includes('financiero')) score += 100;
        else if (combined.includes('financiero') && (combined.includes('estado') || combined.includes('eeff'))) score += 80;
        if (combined.includes('memoria anual') || combined.includes('informe anual')) score += 70;
        if (combined.includes('calificaci') && combined.includes('riesgo')) score += 50;
        if (combined.includes('relevante') || combined.includes('hecho relevante')) score += 30;
        if (combined.includes('financiero')) score += 20;
        if (combined.includes('informe')) score += 10;
        if (combined.includes('2024')) score += 50;
        if (combined.includes('2023')) score += 45;
        if (combined.includes('2022')) score += 40;
        if (combined.includes('2021')) score += 35;
        if (combined.includes('2020')) score += 30;
        return { title: doc.title, score };
    });

    const relevant = scoredDocs.filter(d => d.score > 0);
    console.log(`Relevant (score > 0): ${relevant.length}`);

    console.log("\nTop 10 Relevant:");
    relevant.sort((a, b) => b.score - a.score).slice(0, 10).forEach(d => console.log(`  [${d.score}] ${d.title}`));

    const zero = scoredDocs.filter(d => d.score === 0);
    console.log(`\nZero Score Examples (${zero.length}):`);
    zero.slice(0, 10).forEach(d => console.log(`  [${d.score}] ${d.title}`));
}

diagnose('banpro').then(() => process.exit(0));
