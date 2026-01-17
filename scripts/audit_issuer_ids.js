const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

async function auditIssuerIds() {
    console.log('Iniciando auditoría de IDs en issuerMetrics...');
    const whitelist = [
        "agricorp", "banpro", "bdf", "fama", "fdl", "fid", "horizonte"
    ];

    try {
        const snapshot = await db.collection('issuerMetrics').get();
        const existingIds = [];
        snapshot.forEach(doc => existingIds.push(doc.id));

        console.log('\n--- IDs existentes en Firestore (issuerMetrics) ---');
        existingIds.sort().forEach(id => console.log(`- ${id}`));

        console.log('\n--- Análisis de Cobertura (Whitelist vs Firestore) ---');
        const missing = [];
        const found = [];

        whitelist.forEach(targetId => {
            if (existingIds.includes(targetId)) {
                found.push(targetId);
            } else {
                missing.push(targetId);
            }
        });

        console.log('IDs encontrados (Correctos):', found.join(', '));
        console.log('IDs faltantes (Frontend busca estos pero no están):', missing.join(', '));

        console.log('\n--- Candidatos para Migración (Source IDs potenciales) ---');
        missing.forEach(target => {
            // Buscar IDs que contengan el string o partes
            const candidates = existingIds.filter(eid =>
                eid.includes(target) ||
                target.includes(eid) ||
                eid.replace(/-/g, '').includes(target)
            );
            console.log(`Para '${target}' posibles fuentes: ${candidates.join(', ')}`);
        });

    } catch (error) {
        console.error('Error en auditoría:', error);
    }
}

auditIssuerIds();
