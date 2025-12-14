const fetch = require('node-fetch');

const API_BASE = 'https://us-central1-mvp-nic-market.cloudfunctions.net/api';
// The ID used in the whitelist/aliases
const ISSUER_ID = 'horizonte';

async function checkRemote() {
    console.log(`Checking remote API for issuer: ${ISSUER_ID}`);

    // 1. Get All Issuers to see how it appears in the list
    try {
        const listRes = await fetch(`${API_BASE}/issuers`);
        const listData = await listRes.json();
        const foundInList = listData.issuers.find(i => i.id === ISSUER_ID || i.name.toLowerCase().includes('horizonte'));

        console.log("\n--- /issuers Endpoint ---");
        if (foundInList) {
            console.log("Found in list:", foundInList.name);
            console.log("Documents count:", foundInList.documents ? foundInList.documents.length : 0);
            console.log("Detail URL:", foundInList.detailUrl);
        } else {
            console.log("❌ Not found in /issuers list");
        }

    } catch (e) {
        console.error("Error fetching /issuers:", e.message);
    }

    // 2. Get Specific Issuer Detail
    try {
        console.log(`\n--- /issuer/${ISSUER_ID} Endpoint ---`);
        const detailRes = await fetch(`${API_BASE}/issuer/${ISSUER_ID}`);
        if (detailRes.ok) {
            const detail = await detailRes.json();
            console.log("Name:", detail.name);
            console.log("Documents:", detail.documents ? detail.documents.length : 0);
            if (detail.documents && detail.documents.length > 0) {
                console.log("First 5 docs:", detail.documents.slice(0, 5));
            } else {
                console.log("❌ Documents array is empty.");
            }
        } else {
            console.log(`Failed to fetch detail: ${detailRes.status} ${detailRes.statusText}`);
        }
    } catch (e) {
        console.error("Error fetching detail:", e.message);
    }
}

checkRemote();
