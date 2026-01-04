/**
 * Configuración maestra de emisores para Boletín BVN AI.
 * Centraliza el whitelist, alias, mapeos de extracción y metadatos.
 * Cumple con el principio DRY para evitar duplicación en controladores, tareas y servicios de IA.
 * 
 * VERSION: 2026-01-04 (Carga Dinámica desde Firestore)
 */

const admin = require('firebase-admin');

// --- CONFIGURACIÓN BASE (FALLBACK E INICIALIZACIÓN) ---

const WHITELIST = ["agricorp", "banpro", "bdf", "fama", "fdl", "fid", "horizonte"];

const ALIASES = {
    // Agricorp
    "agri": "agricorp",
    "agri-corp": "agricorp",
    "agricorp": "agricorp",
    "corporacion-agricola": "agricorp",
    "corporacion agricola": "agricorp",
    "corporación agrícola": "agricorp",
    "corporacion-agricola-s-a": "agricorp",

    // Banpro
    "banpro": "banpro",
    "banco de la produccion": "banpro",
    "banco de la producción": "banpro",
    "banco-de-la-produccion": "banpro",
    "banco-de-la-producci-n": "banpro",

    // BDF
    "bdf": "bdf",
    "bancodefinanzas": "bdf",
    "banco de finanzas": "bdf",
    "banco-de-finanzas": "bdf",

    // FAMA
    "fama": "fama",
    "financiera fama": "fama",
    "financiera-fama": "fama",

    // FDL
    "fdl": "fdl",
    "financiera fdl": "fdl",
    "financiera-fdl": "fdl",

    // FID
    "fid": "fid",
    "fid sociedad anonima": "fid",
    "fid, sociedad anónima": "fid",
    "fid-sociedad-an-nima": "fid",
    "fid-s-a": "fid",

    // Horizonte
    "horizonte": "horizonte",
    "horizonte fondo de inversion": "horizonte",
    "horizonte-fondo-de-inversion": "horizonte",
    "horizonte-fondo-de-inversi-n": "horizonte",
    "fondo inversion horizonte": "horizonte",
    "fondo inversión horizonte": "horizonte",
    "fondo-de-inversion-horizonte": "horizonte",
    "horizonte-fondo-de-inversi-n-financiero-de-crecimiento-d-lares-no-diversificado": "horizonte"
};

const EXTRACTION_MAPPING = {
    // Mapea ID canónico -> Lista de IDs técnicos/alias usados como 'issuerId' en Firestore
    "agricorp": ["agricorp", "agri-corp", "corporaci-n-agricola"],
    "banpro": ["banpro", "banco-de-la-producci-n"],
    "bdf": ["bdf", "banco-de-finanzas", "bancodefinanzas"],
    "fama": ["fama"],
    "fdl": ["fdl", "financiera-fdl"],
    "fid": ["fid", "fid-sociedad-an-nima", "fid-s-a"],
    "horizonte": ["horizonte", "horizonte-fondo-de-inversi-n-financiero-de-crecimiento-d-lares-no-diversificado"]
};

// Metadatos para inicialización y visualización
const ISSUER_METADATA = {
    "agricorp": {
        name: "Corporación Agrícola S.A.",
        acronym: "AGRICORP",
        sector: "Industria",
        description: "Principal empresa de agroindustria y distribución de productos básicos en Nicaragua.",
        logoUrl: "https://www.bolsanic.com/wp-content/uploads/2016/12/agricorp.jpg"
    },
    "banpro": {
        name: "Banco de la Producción S.A.",
        acronym: "BANPRO",
        sector: "Banca",
        description: "Institución financiera líder que ofrece servicios bancarios personales y corporativos.",
        logoUrl: "https://www.bolsanic.com/wp-content/uploads/2016/12/banpro.jpg"
    },
    "bdf": {
        name: "Banco de Finanzas S.A.",
        acronym: "BDF",
        sector: "Banca",
        description: "Banco comercial especializado en préstamos hipotecarios y consumo.",
        logoUrl: "https://www.bolsanic.com/wp-content/uploads/2016/12/bdf.jpg"
    },
    "fama": {
        name: "Financiera FAMA S.A.",
        acronym: "FAMA",
        sector: "Microfinanzas",
        description: "Institución financiera enfocada en microfinanzas y apoyo a la pequeña empresa.",
        logoUrl: "https://www.bolsanic.com/wp-content/uploads/2016/12/fama.jpg"
    },
    "fdl": {
        name: "Financiera FDL",
        acronym: "FDL",
        sector: "Microfinanzas",
        description: "Servicios financieros para sectores rurales y urbanos de bajos ingresos.",
        logoUrl: "https://www.bolsanic.com/wp-content/uploads/2016/12/fdl.jpg"
    },
    "fid": {
        name: "FID, Sociedad Anónima (Invercasa)",
        acronym: "FID",
        sector: "Servicios Financieros",
        description: "Sociedad anónima dedicada a la inversión y gestión de activos.",
        logoUrl: "https://www.bolsanic.com/wp-content/uploads/2016/12/logo.png"
    },
    "horizonte": {
        name: "Fondo de Inversión Horizonte",
        acronym: "HORIZONTE",
        sector: "Fondos de Inversión",
        description: "Fondo de inversión financiero de crecimiento en dólares no diversificado.",
        logoUrl: "https://www.bolsanic.com/wp-content/uploads/2016/12/logo.png"
    }
};

/**
 * Normalizes issuer name to a base ID
 */
const getBaseName = (name) => {
    if (!name) return '';
    let normalized = name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove accents
        .trim();

    const separators = [' - ', ' – ', ' — ', '(', ','];
    for (const sep of separators) {
        if (normalized.includes(sep)) {
            normalized = normalized.split(sep)[0].trim();
        }
    }

    if (ALIASES[normalized]) {
        return ALIASES[normalized];
    }
    return normalized;
};

// --- SOPORTE PARA CONFIGURACIÓN DINÁMICA ---
let dynamicConfig = null;
let lastUpdate = 0;
const CACHE_TTL = 300000; // 5 minutos

/**
 * Carga la configuración desde Firestore.
 * Si falla o no hay internet, usa los valores estáticos.
 */
const loadRemoteConfig = async () => {
    const now = Date.now();
    if (dynamicConfig && (now - lastUpdate < CACHE_TTL)) {
        return dynamicConfig;
    }

    try {
        const db = admin.firestore();
        const doc = await db.collection('system_config').doc('issuers').get();

        if (doc.exists) {
            const data = doc.data();
            dynamicConfig = {
                WHITELIST: data.whitelist || WHITELIST,
                ALIASES: data.aliases || ALIASES,
                EXTRACTION_MAPPING: data.extractionMapping || EXTRACTION_MAPPING,
                ISSUER_METADATA: data.metadata || ISSUER_METADATA
            };
            lastUpdate = now;
            console.log('🔄 Configuración de emisores actualizada desde Firestore');
            return dynamicConfig;
        }
    } catch (e) {
        console.warn('⚠️ No se pudo cargar la configuración remota, usando local:', e.message);
    }

    return { WHITELIST, ALIASES, EXTRACTION_MAPPING, ISSUER_METADATA };
};

/**
 * Returns all known aliases for a given canonical issuer ID
 */
const getAliasesForIssuer = (issuerId) => {
    return Object.entries(ALIASES)
        .filter(([alias, canonical]) => canonical === issuerId && alias !== issuerId)
        .map(([alias]) => alias);
};

/**
 * Consolidates a list of issuers into unique entities based on the whitelist.
 * @param {Array} issuers - List of raw issuer objects
 * @returns {Array} Consolidated list of issuers
 */
const consolidateIssuers = (issuers) => {
    const issuerMap = new Map();
    const sortedIssuers = [...issuers].sort((a, b) => b.name.length - a.name.length);

    sortedIssuers.forEach(issuer => {
        const baseName = getBaseName(issuer.name);
        if (!WHITELIST.includes(baseName)) return;

        if (!issuerMap.has(baseName)) {
            const config = ISSUER_METADATA[baseName];
            const newIssuer = {
                ...JSON.parse(JSON.stringify(issuer)),
                id: baseName,
                displayName: config?.name || issuer.name,
                acronym: config?.acronym || issuer.acronym || baseName.toUpperCase().substring(0, 4)
            };
            issuerMap.set(baseName, newIssuer);
        } else {
            const existing = issuerMap.get(baseName);
            if (issuer.documents && Array.isArray(issuer.documents)) {
                const existingDocsUrls = new Set(existing.documents.map(d => d.url));
                issuer.documents.forEach(doc => {
                    if (!existingDocsUrls.has(doc.url)) {
                        existing.documents.push(doc);
                        existingDocsUrls.add(doc.url);
                    }
                });
            }
            if (!existing.sector && issuer.sector) existing.sector = issuer.sector;
            if (!existing.logoUrl && issuer.logoUrl) existing.logoUrl = issuer.logoUrl;
            const config = ISSUER_METADATA[baseName];
            if (config?.acronym) existing.acronym = config.acronym;
        }
    });
    return Array.from(issuerMap.values());
};

/**
 * Matches an input name against the canonical whitelist using aliases and normalization.
 */
const findIssuerId = (inputRaw) => {
    if (!inputRaw || inputRaw === "Desconocido") return null;

    const inputLower = inputRaw.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "")
        .trim();

    // 1. Direct Whitelist Check
    if (WHITELIST.includes(inputLower)) return inputLower;

    // 2. Alias Check (Normalized)
    for (const [alias, id] of Object.entries(ALIASES)) {
        const normAlias = alias.toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]/g, "")
            .trim();
        if (normAlias === inputLower || inputLower.includes(normAlias)) return id;
    }

    // 3. Extraction Mapping Check
    for (const [id, mappings] of Object.entries(EXTRACTION_MAPPING)) {
        if (mappings.some(m => {
            const nm = m.toLowerCase().replace(/[^a-z0-9]/g, "");
            return inputLower.includes(nm) || nm.includes(inputLower);
        })) return id;
    }

    return null;
};

module.exports = {
    WHITELIST,
    ALIASES,
    EXTRACTION_MAPPING,
    ISSUER_METADATA,
    getBaseName,
    getAliasesForIssuer,
    consolidateIssuers,
    findIssuerId,
    loadRemoteConfig
};
