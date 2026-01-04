const admin = require('firebase-admin');

if (!admin.apps.length) {
    admin.initializeApp({
        projectId: 'mvp-nic-market'
    });
}

const db = admin.firestore();

const CONFIG = {
    whitelist: ["agricorp", "banpro", "bdf", "fama", "fdl", "fid", "horizonte"],
    displayNames: {
        "agricorp": "Agricorp", "banpro": "Banpro", "bdf": "BDF",
        "fama": "Financiera FAMA", "fdl": "Financiera FDL",
        "fid": "FID", "horizonte": "Fondo de Inversión Horizonte"
    },
    metadata: {
        "agricorp": { acronym: "AGRI", sector: "Industria" },
        "banpro": { acronym: "BANPRO", sector: "Banca" },
        "bdf": { acronym: "BDF", sector: "Banca" },
        "fama": { acronym: "FAMA", sector: "Microfinanzas" },
        "fdl": { acronym: "FDL", sector: "Microfinanzas" },
        "fid": { acronym: "FID", sector: "Servicios Financieros" },
        "horizonte": { acronym: "HORIZONTE", sector: "Fondos de Inversión" }
    },
    aliases: {
        "agri": "agricorp", "corporacion agricola": "agricorp",
        "banco de la produccion": "banpro", "banco de la producción": "banpro",
        "bancodefinanzas": "bdf", "banco de finanzas": "bdf",
        "financiera fama": "fama", "financiera fdl": "fdl",
        "fid sociedad anonima": "fid", "fid, s.a": "fid", "fid-s-a": "fid",
        "horizonte fondo de inversion": "horizonte", "horizonte-fondo-de-inversion": "horizonte",
        "fondo inversion horizonte": "horizonte", "fondo inversión horizonte": "horizonte"
    },
    extractionMapping: {
        "agricorp": [
            "agri-corp", "corporaci-n-agricola", "Corporación Agricola",
            "agricorp", "corporacion agricola", "corporacion agricorp",
            "agricorp – aviso de oferta publica"
        ],
        "banpro": ["banpro", "Banco De La Producción", "banco-de-la-producci-n"],
        "bdf": ["banco-de-finanzas", "Banco De Finanzas", "bdf"],
        "fama": ["fama", "FAMA"],
        "fdl": ["financiera-fdl", "Financiera FDL", "fdl"],
        "fid": ["fid", "fid-sociedad-an-nima", "FID, Sociedad Anónima", "fid-s-a"],
        "horizonte": [
            "horizonte-fondo-de-inversi-n-financiero-de-crecimiento-d-lares-no-diversificado",
            "horizonte-fondo-de-inversi-n",
            "HORIZONTE FONDO DE INVERSIÓN FINANCIERO DE CRECIMIENTO DÓLARES, NO DIVERSIFICADO",
            "horizonte-fondo-de-inversion"
        ]
    }
};

(async () => {
    console.log("UPDATING SYSTEM CONFIG...");
    try {
        await db.collection('system_config').doc('issuers').set(CONFIG, { merge: true });
        console.log("CONFIG UPDATED SUCCESSFULLY.");
    } catch (e) {
        console.error("UPDATE FAILED:", e);
    }
})();
