const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin (adjust path to service account if needed, 
// but usually in these environments it's handled via ADC or env vars)
if (!admin.apps.length) {
    admin.initializeApp({
        // Assuming environment provides configuration
    });
}

const db = admin.firestore();

const WHITESLIST_DATA = {
    whitelist: [
        "agricorp",
        "banpro",
        "bdf",
        "fama",
        "fdl",
        "fid",
        "horizonte"
    ],
    displayNames: {
        "agricorp": "Agricorp",
        "banpro": "Banpro",
        "bdf": "BDF",
        "fama": "Financiera FAMA",
        "fdl": "Financiera FDL",
        "fid": "FID",
        "horizonte": "Fondo de Inversión Horizonte"
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
        "fid sociedad anonima": "fid", "horizonte fondo de inversion": "horizonte",
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
        "fid": ["fid", "fid-sociedad-an-nima", "FID, Sociedad Anónima"],
        "horizonte": [
            "horizonte-fondo-de-inversi-n-financiero-de-crecimiento-d-lares-no-diversificado",
            "horizonte-fondo-de-inversi-n",
            "HORIZONTE FONDO DE INVERSIÓN FINANCIERO DE CRECIMIENTO DÓLARES, NO DIVERSIFICADO"
        ]
    }
};

async function seedConfig() {
    console.log('--- Seeding System Configuration ---');
    try {
        await db.collection('system_config').doc('issuers').set(WHITESLIST_DATA);
        console.log('✅ Success: system_config/issuers seeded correctly.');
    } catch (error) {
        console.error('❌ Error seeding config:', error);
        process.exit(1);
    }
    process.exit(0);
}

seedConfig();
