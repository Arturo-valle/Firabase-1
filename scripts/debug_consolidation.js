const https = require('https');

// --- LOGIC COPIED FROM issuerTransformers.ts ---
const WHITELIST = ["agricorp", "banpro", "bdf", "fama", "fdl", "fid", "horizonte"];

const getFrontendBaseName = (name) => {
    if (!name) return '';
    let normalized = name.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();

    // Simplification of aliases for debug
    const aliases = {
        "corporacion agricola": "agricorp",
        "banco de la produccion": "banpro",
        "banco de la producción": "banpro",
        "bancodefinanzas": "bdf",
        "banco de finanzas": "bdf"
    };
    return aliases[normalized] || normalized;
};

const consolidateIssuers = (rawIssuers) => {
    const consolidatedMap = new Map();

    rawIssuers.forEach((issuer) => {
        let baseId = issuer.id && WHITELIST.includes(issuer.id)
            ? issuer.id
            : getFrontendBaseName(issuer.name);

        console.log(`Checking [${issuer.id || 'NO_ID'}] Name: "${issuer.name}" -> baseId: "${baseId}"`);

        if (!WHITELIST.includes(baseId)) {
            console.log(`   ❌ baseId "${baseId}" NOT in whitelist.`);
            return;
        }

        if (!consolidatedMap.has(baseId)) {
            console.log(`   ✅ Adding [${baseId}]`);
            consolidatedMap.set(baseId, {
                id: baseId,
                documents: issuer.documents || []
            });
        } else {
            console.log(`   🤝 Merging [${baseId}]`);
        }
    });

    return Array.from(consolidatedMap.values())
        .filter(issuer => {
            const hasDocs = issuer.documents.length > 0;
            const isWhitelisted = WHITELIST.includes(issuer.id);
            const keep = hasDocs || isWhitelisted;
            console.log(`Filter [${issuer.id}]: Docs ${issuer.documents.length}, Whitelisted: ${isWhitelisted} -> Keep: ${keep}`);
            return keep;
        });
};
// --- END LOGIC ---

const url = 'https://api-os3qsxfz6q-uc.a.run.app/issuers';

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        const json = JSON.parse(data);
        const result = consolidateIssuers(json.issuers || []);
        console.log(`\n📊 FINAL COUNT: ${result.length}`);
    });
});
