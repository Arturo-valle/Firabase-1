const https = require('https');

const API_URL = 'https://us-central1-mvp-nic-market.cloudfunctions.net/api/issuers';

// === FRONTEND LOGIC REPLICATION ===
const DISPLAY_NAMES = {
    "agri-corp": "Agricorp",
    "banpro": "Banpro",
    "bdf": "BDF",
    "fama": "Financiera FAMA",
    "fdl": "Financiera FDL",
    "fid": "FID",
    "horizonte": "Fondo de Inversión Horizonte"
};

const WHITELIST = [
    "agri-corp",
    "banpro",
    "bdf",
    "fama",
    "fdl",
    "fid",
    "horizonte"
];

const getFrontendBaseName = (name) => {
    if (!name) return "UNKNOWN";
    let normalized = name.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

    const separators = [' - ', ' – ', ' — ', '(', ','];
    for (const sep of separators) {
        if (normalized.includes(sep)) {
            normalized = normalized.split(sep)[0].trim();
        }
    }

    const aliases = {
        "agri": "agri-corp",
        "agri-corp": "agri-corp",
        "agricorp": "agri-corp",
        "corporacion agricola": "agri-corp",

        "banpro": "banpro",
        "banco de la produccion": "banpro",
        "banco de la producción": "banpro",

        "bdf": "bdf",
        "bancodefinanzas": "bdf",
        "banco de finanzas": "bdf",

        "fama": "fama",
        "financiera fama": "fama",

        "fdl": "fdl",
        "financiera fdl": "fdl",

        "fid": "fid",
        "fid sociedad anonima": "fid",

        "horizonte": "horizonte",
        "horizonte fondo de inversion": "horizonte",
        "fondo inversion horizonte": "horizonte",
        "fondo inversión horizonte": "horizonte",
        "horizonte fondo de inversion financiero de crecimiento dolares": "horizonte"
    };

    return aliases[normalized] || normalized;
};

// === FETCH AND AUDIT ===
https.get(API_URL, (res) => {
    const chunks = [];
    res.on('data', (chunk) => chunks.push(chunk));
    res.on('end', () => {
        try {
            const data = Buffer.concat(chunks).toString('utf8');
            const json = JSON.parse(data);
            const rawIssuers = json.issuers || [];

            console.log(`\n### API Report`);
            console.log(`Total Raw Entries: ${rawIssuers.length}`);

            const auditMap = {};
            // Initialize whitelist
            WHITELIST.forEach(id => {
                auditMap[id] = {
                    id: id,
                    name: DISPLAY_NAMES[id],
                    foundInApi: false,
                    rawNamesFound: [],
                    docCount: 0,
                    active: false
                };
            });

            // Process API Data
            const otherActive = [];

            rawIssuers.forEach(issuer => {
                const baseId = getFrontendBaseName(issuer.name);
                const hasDocs = issuer.documents && issuer.documents.length > 0;

                if (WHITELIST.includes(baseId)) {
                    auditMap[baseId].foundInApi = true;
                    auditMap[baseId].rawNamesFound.push(issuer.name);
                    auditMap[baseId].docCount += (issuer.documents || []).length;
                    if (hasDocs || issuer.active) auditMap[baseId].active = true;
                } else {
                    if (hasDocs || issuer.active) {
                        otherActive.push({
                            name: issuer.name,
                            id: issuer.id,
                            baseId: baseId,
                            docs: (issuer.documents || []).length
                        });
                    }
                }
            });

            // OUTPUT TABLE
            console.log(`\n## Auditoria de Emisores (Whitelist vs API Real)\n`);
            console.log(`| Emisor (Whitelist) | ID Sistema | API Found? | Active/Docs? | Raw Names (API) | Docs Count |`);
            console.log(`|---|---|---|---|---|---|`);

            Object.values(auditMap).forEach(item => {
                const statusEmoji = item.active ? "✅" : (item.foundInApi ? "⚠️ (Sin Docs)" : "❌ Missing");
                const uniqueNames = [...new Set(item.rawNamesFound)].join(", ");
                console.log(`| ${item.name} | \`${item.id}\` | ${item.foundInApi ? "YES" : "NO"} | ${statusEmoji} | ${uniqueNames || "-"} | ${item.docCount} |`);
            });

            if (otherActive.length > 0) {
                console.log(`\n### Otros Emisores Activos en API (Fuera de Whitelist)`);
                otherActive.forEach(i => console.log(`- ${i.name} (\`${i.id || "N/A"}\`) -> BaseID: ${i.baseId}, Docs: ${i.docs}`));
            }

        } catch (e) {
            console.error("Error parsing JSON:", e);
        }
    });
}).on('error', (e) => {
    console.error("Error fetching API:", e);
});
