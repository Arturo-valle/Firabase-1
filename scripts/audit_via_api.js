const https = require('https');

const API_BASE_URL = 'https://us-central1-mvp-nic-market.cloudfunctions.net/api';

const ISSUERS = [
    "agri-corp",
    "banpro",
    "bdf",
    "fama",
    "fdl",
    "fid",
    "horizonte"
];

const YEARS = ["2020", "2021", "2022", "2023", "2024"];

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
    console.log("Starting Global API Audit v2...");
    console.log("--------------------------------------------------------------------------------------------------");
    console.log("| Issuer ID | Year | History (Assets) | Docs Found (Sample Years) | Status |");
    console.log("|-----------|------|------------------|---------------------------|--------|");

    for (const issuerId of ISSUERS) {
        // Fetch History
        const historyRes = await fetchUrl(`${API_BASE_URL}/metrics/history/${issuerId}`);
        const history = (historyRes.status === 200 && Array.isArray(historyRes.data)) ? historyRes.data : [];

        // Fetch Recent Docs
        const chunksRes = await fetchUrl(`${API_BASE_URL}/debug/recent-chunks/${issuerId}`);
        const documents = (chunksRes.status === 200 && chunksRes.data.documents) ? chunksRes.data.documents : [];

        const docYears = [...new Set(documents.map(d => {
            const date = String(d.date || d.title || "");
            const match = date.match(/\d{4}/);
            return match ? match[0] : null;
        }).filter(y => y))];

        for (const year of YEARS) {
            const hData = history.find(h => String(h.period) === year);
            const assets = hData ? (hData.activosTotales || "N/D") : "❌ Missing";
            const docStatus = docYears.includes(year) ? "✅ Yes" : "❌ No";

            const statusStr = (assets !== "N/D" && assets !== "❌ Missing") ? "OK" : (docStatus === "✅ Yes" ? "RE-EXTRACT" : "SCRAPE");

            console.log(`| ${issuerId.padEnd(10)} | ${year} | ${String(assets).padEnd(16)} | ${docStatus.padEnd(25)} | ${statusStr.padEnd(6)} |`);
        }
    }
    console.log("--------------------------------------------------------------------------------------------------");
}

runAudit();
