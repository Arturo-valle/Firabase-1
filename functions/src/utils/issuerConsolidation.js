
// Configuration for Official Active Issuers
// TODO: Move this to Firestore configuration in the future
const WHITELIST_CONFIG = {
    "agricorp": { name: "Agricorp", acronym: "AGRI", type: "private" },
    "banpro": { name: "Banpro", acronym: "BANP", type: "private" },
    "bdf": { name: "Banco de Finanzas (BDF)", acronym: "BDF", type: "private" },
    "fama": { name: "Financiera FAMA", acronym: "FAMA", type: "private" },
    "fdl": { name: "Financiera FDL", acronym: "FDL", type: "private" },
    "fid": { name: "FID, Sociedad Anónima", acronym: "FID", type: "private" },
    "horizonte": { name: "Fondo Inversión Horizonte", acronym: "FOND", type: "private" }
};

const WHITELIST = Object.keys(WHITELIST_CONFIG);

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

/**
 * Normalizes issuer name to a base ID
 */
const getBaseName = (name) => {
    if (!name) return '';

    // 1. Normalize and lowercase
    let normalized = name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove accents
        .trim();

    // 2. Handle separators (en-dash, em-dash, hyphen)
    const separators = [' - ', ' – ', ' — ', '(', ','];
    for (const sep of separators) {
        if (normalized.includes(sep)) {
            normalized = normalized.split(sep)[0].trim();
        }
    }

    // 3. Check Alias Map
    if (ALIAS_MAP[normalized]) {
        return ALIAS_MAP[normalized];
    }

    return normalized;
};

/**
 * Consolidates a list of issuers into unique entities based on the whitelist.
 * @param {Array} issuers - List of raw issuer objects
 * @returns {Array} Consolidated list of issuers
 */
const consolidateIssuers = (issuers) => {
    const issuerMap = new Map();

    // Sort by name length to process longer (more specific) names first if needed, 
    // though alias map handles most cases.
    const sortedIssuers = [...issuers].sort((a, b) => b.name.length - a.name.length);

    sortedIssuers.forEach(issuer => {
        const baseName = getBaseName(issuer.name);

        // STRICT WHITELIST CHECK
        if (!WHITELIST.includes(baseName)) {
            return;
        }

        if (!issuerMap.has(baseName)) {
            // Create new entry
            const config = WHITELIST_CONFIG[baseName];
            const newIssuer = {
                ...JSON.parse(JSON.stringify(issuer)),
                id: baseName,
                // Use canonical name and acronym from config if available
                displayName: config?.name || issuer.name,
                acronym: config?.acronym || issuer.acronym || baseName.toUpperCase().substring(0, 4)
            };
            issuerMap.set(baseName, newIssuer);
        } else {
            // Merge into existing entry
            const existing = issuerMap.get(baseName);

            // Merge documents
            if (issuer.documents && Array.isArray(issuer.documents)) {
                const existingDocsUrls = new Set(existing.documents.map(d => d.url));
                issuer.documents.forEach(doc => {
                    if (!existingDocsUrls.has(doc.url)) {
                        existing.documents.push(doc);
                        existingDocsUrls.add(doc.url);
                    }
                });
            }

            // Merge metadata if missing in existing
            if (!existing.sector && issuer.sector) existing.sector = issuer.sector;
            if (!existing.logoUrl && issuer.logoUrl) existing.logoUrl = issuer.logoUrl;

            // Ensure acronym is always the canonical one
            const config = WHITELIST_CONFIG[baseName];
            if (config?.acronym) {
                existing.acronym = config.acronym;
            }
        }
    });

    return Array.from(issuerMap.values());
};

module.exports = {
    consolidateIssuers,
    WHITELIST,
    ALIAS_MAP,
    getBaseName
};
