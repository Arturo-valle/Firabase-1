
const ALIAS_MAP = {
    // Agricorp
    "agri": "agricorp",
    "agricorp": "agricorp",
    "corporacion agricola": "agricorp",

    // Banpro
    "banpro": "banpro",
    "banco de la produccion": "banpro",
    "banco de la producción": "banpro",

    // BDF
    "bdf": "bdf",
    "bancodefinanzas": "bdf",
    "banco de finanzas": "bdf",

    // FAMA
    "fama": "fama",
    "financiera fama": "fama",

    // FDL
    "fdl": "fdl",
    "financiera fdl": "fdl",

    // FID
    "fid": "fid",
    "fid sociedad anonima": "fid",

    // Horizonte
    "horizonte": "horizonte",
    "horizonte fondo de inversion": "horizonte",
    "fondo inversion horizonte": "horizonte",
    "fondo inversión horizonte": "horizonte"
};

const getBaseName = (name) => {
    if (!name) return '';

    // 1. Normalize and lowercase
    let normalized = name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove accents
        .trim();

    console.log(`Normalized: "${normalized}"`);

    // 2. Handle separators (en-dash, em-dash, hyphen)
    const separators = [' - ', ' – ', ' — ', '(', ','];
    for (const sep of separators) {
        if (normalized.includes(sep)) {
            console.log(`Found separator: "${sep}"`);
            normalized = normalized.split(sep)[0].trim();
            break;
        }
    }

    console.log(`After Split: "${normalized}"`);

    // 3. Check Alias Map
    if (ALIAS_MAP[normalized]) {
        return ALIAS_MAP[normalized];
    }

    return normalized;
};

const testCases = [
    "AGRICORP – Aviso de Oferta Pública",
    "Financiera FAMA – Calificación de Riesgo con corte a diciembre 2022",
    "BDF – Suscripción Préstamo para Financiamiento...",
    "BANPRO – Aviso de Oferta Pública",
    "FID,S.A. – Calificación de Riesgo con corte a diciembre 2022",
    "Financiera FDL",
    "Fondo Inversión Horizonte"
];

testCases.forEach(test => {
    console.log(`\nTesting: "${test}"`);
    const result = getBaseName(test);
    console.log(`Result: "${result}"`);
});
