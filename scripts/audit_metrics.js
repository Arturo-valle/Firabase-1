const https = require('https');

const API_BASE_URL = 'https://us-central1-mvp-nic-market.cloudfunctions.net/api';

// Frontend Whitelisted Issuers (IDs used in the app)
const ISSUERS = [
    { id: "agri-corp", backendCandidate: "agricorp" }, // Known mismatch
    { id: "banpro", backendCandidate: "banpro" },
    { id: "bdf", backendCandidate: "bdf" },
    { id: "fama", backendCandidate: "fama" },
    { id: "fdl", backendCandidate: "financiera-fdl" }, // Potential mismatch from api.js alias
    { id: "fid", backendCandidate: "fid-sociedad-an-nima" }, // Potential mismatch from api.js alias
    { id: "horizonte", backendCandidate: "horizonte-fondo-de-inversi-n" } // Potential mismatch
];

async function fetchUrl(url) {
    return new Promise((resolve) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(data) });
                } catch (e) {
                    resolve({ status: res.statusCode, data: null, error: e.message });
                }
            });
        }).on('error', (e) => resolve({ status: 500, error: e.message }));
    });
}

async function runAudit() {
    console.log("### Auditoría de Endpoints de Métricas (Pre-Deploy) ###\n");
    console.log("| ID Frontend | Endpoint | ID Probado | Status | Entries | Sample Year |");
    console.log("|---|---|---|---|---|---|");

    for (const issuer of ISSUERS) {
        // Test 1: Frontend ID
        await check(issuer.id, issuer.id, "Frontend ID");

        // Test 2: Backend Candidate (if different)
        if (issuer.backendCandidate && issuer.backendCandidate !== issuer.id) {
            await check(issuer.id, issuer.backendCandidate, "Backend ID");
        }
    }
}

async function check(labelId, testId, type) {
    const url = `${API_BASE_URL}/metrics/history/${testId}`;
    const result = await fetchUrl(url);

    let entries = 0;
    let sampleYear = "-";

    if (result.status === 200 && Array.isArray(result.data)) {
        entries = result.data.length;
        if (entries > 0) sampleYear = result.data[0].year || "N/A";
    }

    const statusIcon = (result.status === 200 && entries > 0) ? "✅ " : (result.status === 200 ? "⚠️ Empty" : "❌ Error");

    console.log(`| ${labelId} | /history/${testId} | ${testId} | ${statusIcon} ${result.status} | ${entries} | ${sampleYear} |`);
}

runAudit();
