const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'mvp-nic-market' });
const db = admin.firestore();

async function probeIDs() {
    const targets = [
        'fdl', 'financiera-fdl', 'financiera-fdl-s-a',
        'agricorp', 'corporacion-agricola', 'corporaci-n-agricola',
        'fid', 'fid-sociedad-an-nima',
        'horizonte', 'horizonte-fondo-de-inversi-n-financiero-de-crecimiento-d-lares-no-diversificado',
        'banpro', 'banco-de-la-produccion',
        'fama'
    ];

    for (const t of targets) {
        const snap = await db.collection('documentChunks').where('issuerId', '==', t).limit(1).get();
        console.log(`ID '${t}': ${snap.empty ? 'EMPTY' : 'FOUND'}`);
    }
}
probeIDs();
