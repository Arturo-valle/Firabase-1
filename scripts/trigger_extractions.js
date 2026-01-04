const axios = require('axios');

const API_BASE_URL = 'https://api-os3qsxfz6q-uc.a.run.app';
const ISSUERS = ["banpro", "bdf", "horizonte", "fama", "fdl", "fid"];

async function run() {
    for (const id of ISSUERS) {
        try {
            console.log(`Triggering extract history for ${id}...`);
            const res = await axios.post(`${API_BASE_URL}/metrics/history/extract/${id}`);
            console.log(`Result ${id}:`, res.data.success ? "Success" : "Failed");
        } catch (e) {
            console.error(`Error ${id}:`, e.response ? e.response.data : e.message);
        }
        // Wait 5s between issuers to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
}

run();
