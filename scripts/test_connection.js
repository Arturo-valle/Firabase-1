const https = require('https');

const BASE_URL = 'https://api-os3qsxfz6q-uc.a.run.app';

function check(path) {
    console.log(`Checking ${BASE_URL}${path}...`);
    https.get(`${BASE_URL}${path}`, (res) => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
            console.log(`[${path}] Status: ${res.statusCode}`);
            if (res.statusCode !== 200) {
                console.log("Body:", data.substring(0, 200));
            } else {
                console.log("Success (Body truncated)");
            }
        });
    }).on('error', e => console.error(e.message));
}

check('/metrics/bdf');
check('/debug/view-text/bdf');
