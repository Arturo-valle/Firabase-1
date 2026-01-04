const https = require('https');

const API_URL = 'https://us-central1-mvp-nic-market.cloudfunctions.net/api/issuers';

https.get(API_URL, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            console.log("\n### RAW IDS FROM API ###");
            json.issuers.forEach(i => {
                if (i.documents && i.documents.length > 0) {
                    console.log(`Name: "${i.name.substring(0, 30)}..." -> ID: "${i.id}" (Docs: ${i.documents.length})`);
                }
            });
        } catch (e) {
            console.error(e);
        }
    });
});
