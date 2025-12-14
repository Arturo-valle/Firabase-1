const fs = require('fs');

// --- Helper Functions (Copied from functions/api.js) ---

const ALIAS_MAP = {
    "agri": "agricorp",
    "agricorp": "agricorp",
    "bac nicaragua": "bac",
    "bac": "bac",
    "bancodefinanzas": "bdf",
    "banco de finanzas": "bdf",
    "bdf": "bdf",
    "banpro": "banpro",
    "banco de la produccion": "banpro",
    "banco de la producción": "banpro",
    "financiera fama": "fama",
    "fama": "fama",
    "credomatic": "bac"
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
            if (!existing.sector && issuer.sector) existing.sector = issuer.sector;
            if (!existing.logoUrl && issuer.logoUrl) existing.logoUrl = issuer.logoUrl;
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
    console.log(`Consolidated count: ${consolidated.length}`);

    // Check specific issuers
    const checkIssuer = (id) => {
        const found = consolidated.find(i => i.id === id);
        if (found) {
            console.log(`✅ Found ${id}: ${found.name} (${found.documents.length} docs)`);
        } else {
            console.log(`❌ Missing ${id}`);
        }
    };

    checkIssuer('agricorp');
    checkIssuer('bac');
    checkIssuer('banpro');
    checkIssuer('bdf');
    checkIssuer('fama');

    // Check for duplicates
    const ids = consolidated.map(i => i.id);
    const uniqueIds = new Set(ids);
    if (ids.length !== uniqueIds.size) {
        console.log('❌ Duplicates found in IDs!');
    } else {
        console.log('✅ No ID duplicates.');
    }

} catch (e) {
    console.error(e);
}
