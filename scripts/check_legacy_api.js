const https = require('https');

const url = 'https://us-central1-mvp-nic-market.cloudfunctions.net/api/issuers';

console.log(`Fetching from LEGACY: ${url}`);

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            const issuers = json.issuers || [];
            console.log(`\n✅ Status: ${res.statusCode}`);
            console.log(`📊 Count: ${issuers.length}`);
            console.log(`🔍 IDs: ${issuers.map(i => i.id).join(', ')}`);
        } catch (e) {
            console.error('Error:', e.message);
        }
    });
});
