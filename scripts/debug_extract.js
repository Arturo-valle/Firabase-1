const axios = require('axios');

const API_BASE_URL = 'https://api-os3qsxfz6q-uc.a.run.app';

async function run() {
    try {
        console.log("Triggering extract history for banpro...");
        const res = await axios.post(`${API_BASE_URL}/metrics/history/extract/banpro`);
        console.log("Result:", JSON.stringify(res.data, null, 2));
    } catch (e) {
        console.error("Error:", e.response ? e.response.data : e.message);
    }
}

run();
