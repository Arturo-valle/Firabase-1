const fs = require('fs');

// --- Helper Functions (Copied from functions/api.js) ---

// OFFICIAL ACTIVE ISSUERS (7)
const WHITELIST = [
    "agricorp",
    "banpro",
    "bdf",
    "fama",
    "fdl",
    "fid",
    "horizonte"
];

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

const consolidateIssuers = (issuers) => {
    const issuerMap = new Map();
    const sortedIssuers = [...issuers].sort((a, b) => b.name.length - a.name.length);

    sortedIssuers.forEach(issuer => {
        const baseName = getBaseName(issuer.name);

        // STRICT WHITELIST CHECK
        if (!WHITELIST.includes(baseName)) {
            return;
        }

        if (!issuerMap.has(baseName)) {
            const newIssuer = JSON.parse(JSON.stringify(issuer));
            newIssuer.id = baseName;
            issuerMap.set(baseName, newIssuer);
        } else {
            const existing = issuerMap.get(baseName);
            const existingDocsUrls = new Set(existing.documents.map(d => d.url));
            if (issuer.documents) {
                issuer.documents.forEach(doc => {
                    if (!existingDocsUrls.has(doc.url)) {
                        existing.documents.push(doc);
                        existingDocsUrls.add(doc.url);
                    }
                });
            }
        }
    });

    return Array.from(issuerMap.values());
};

// --- Execution ---

try {
    const rawData = fs.readFileSync('issuers_list.json', 'utf8');
    const jsonData = JSON.parse(rawData);
    const issuers = jsonData.issuers || jsonData;

    console.log(`Original count: ${issuers.length}`);

    const consolidated = consolidateIssuers(issuers);
    console.log(`Consolidated (Whitelisted) count: ${consolidated.length}`);

    // Verify only 7 exist
    const allowedIds = new Set(WHITELIST);
    const foundIds = consolidated.map(i => i.id);

    console.log('\n--- Found Issuers ---');
    foundIds.forEach(id => {
        if (allowedIds.has(id)) {
            console.log(`✅ ${id}`);
        } else {
            console.log(`❌ ${id} (Should NOT be here)`);
        }
    });

    // Check for BAC
    if (foundIds.includes('bac')) {
        console.log('\n❌ BAC is still present!');
    } else {
        console.log('\n✅ BAC successfully removed.');
    }

    if (consolidated.length === 7) {
        console.log('\n✅ SUCCESS: Exactly 7 issuers found.');
    } else {
        console.log(`\n⚠️ WARNING: Found ${consolidated.length} issuers instead of 7.`);
    }

} catch (e) {
    console.error(e);
}
