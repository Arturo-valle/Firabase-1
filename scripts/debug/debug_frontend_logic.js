
const fetch = require('node-fetch');

// Mock constants from marketDataApi.ts
const DISPLAY_NAMES = {
    "agricorp": "Agricorp",
    "banpro": "Banpro",
    "bdf": "BDF",
    "fama": "Financiera FAMA",
    "fdl": "Financiera FDL",
    "fid": "FID",
    "horizonte": "Fondo de Inversión Horizonte"
};

const ISSUER_METADATA = {
    "agricorp": { acronym: "AGRI", sector: "Industria" },
    "banpro": { acronym: "BANPRO", sector: "Banca" },
    "bdf": { acronym: "BDF", sector: "Banca" },
    "fama": { acronym: "FAMA", sector: "Microfinanzas" },
    "fdl": { acronym: "FDL", sector: "Microfinanzas" },
    "fid": { acronym: "FID", sector: "Servicios Financieros" },
    "horizonte": { acronym: "HORIZONTE", sector: "Fondos de Inversión" }
};

const WHITELIST = [
    "agricorp",
    "banpro",
    "bdf",
    "fama",
    "fdl",
    "fid",
    "horizonte"
];

// Logic from marketDataApi.ts
const getFrontendBaseName = (name) => {
    if (!name) return '';
    let normalized = name.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

    const separators = [' - ', ' – ', ' — ', '(', ','];
    for (const sep of separators) {
        if (normalized.includes(sep)) {
            normalized = normalized.split(sep)[0].trim();
        }
    }

    const aliases = {
        "agri": "agricorp",
        "agricorp": "agricorp",
        "corporacion agricola": "agricorp",
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
        "fondo inversión horizonte": "horizonte"
    };

    return aliases[normalized] || normalized;
};

// Logic from metricsApi.ts
function normalizeIssuerId(id) {
    return id
        .replace(/_/g, ' ')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

async function runDebug() {
    console.log("Starting Debug...");
    const API_BASE_URL = 'https://us-central1-mvp-nic-market.cloudfunctions.net/api';

    // 1. Fetch Issuers
    try {
        console.log("Fetching issuers...");
        const response = await fetch(`${API_BASE_URL}/issuers?t=${Date.now()}`);
        const data = await response.json();

        console.log(`Raw issuers count: ${data.issuers.length}`);

        // Consolidate
        const consolidatedMap = new Map();
        data.issuers.forEach((issuer) => {
            const baseId = getFrontendBaseName(issuer.name);

            if (!WHITELIST.includes(baseId)) return;

            if (!consolidatedMap.has(baseId)) {
                consolidatedMap.set(baseId, {
                    ...issuer,
                    id: baseId, // THE CRITICAL ASSIGNMENT
                    isActive: true
                });
            }
        });

        const activeIssuers = Array.from(consolidatedMap.values());
        console.log("Active Whitelisted Issuers:", activeIssuers.map(i => ({ id: i.id, name: i.name })));

        // 2. Try to fetch metrics for each
        for (const issuer of activeIssuers) {
            const normalizedId = normalizeIssuerId(issuer.id);
            const url = `${API_BASE_URL}/metrics/${normalizedId}`;
            console.log(`\nChecking metrics for ID: ${issuer.id} (Normalized: ${normalizedId}) -> ${url}`);

            try {
                const mRes = await fetch(url);
                if (mRes.ok) {
                    const mData = await mRes.json();
                    if (mData.success && mData.metrics) {
                        console.log("  [SUCCESS] Metrics found:", Object.keys(mData.metrics).join(', '));
                    } else {
                        console.log("  [FAILED] Success false or no metrics:", mData);
                    }
                } else {
                    console.log(`  [FAILED] HTTP ${mRes.status}`);
                }
            } catch (e) {
                console.log("  [ERROR] Fetch failed:", e.message);
            }
        }

    } catch (e) {
        console.error("Critical failure:", e);
    }
}

runDebug();
