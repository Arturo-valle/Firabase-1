const https = require('https');
const { consolidateIssuers, WHITELIST } = require('../webapp/src/utils/issuerTransformers');

const url = 'https://api-os3qsxfz6q-uc.a.run.app/issuers';

console.log(`Fetching from: ${url}`);
console.log(`Frontend WHITELIST: ${WHITELIST.join(', ')}`);

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            const rawIssuers = json.issuers || [];
            console.log(`\n📦 Raw Issuers from API: ${rawIssuers.length}`);

            const consolidated = consolidateIssuers(rawIssuers);
            console.log(`\n📊 Consolidated Issuers: ${consolidated.length}`);
            console.log(`🔍 IDs: ${consolidated.map(i => i.id).join(', ')}`);

            if (consolidated.length < rawIssuers.length) {
                console.log('\n❌ Transformation filtered some issuers.');
                rawIssuers.forEach(ri => {
                    const isConsolidated = consolidated.find(c => c.id === ri.id);
                    if (!isConsolidated) {
                        console.log(`   - Filtered: [${ri.id}] Name: ${ri.name}`);
                    }
                });
            } else {
                console.log('\n✅ No issuers filtered by transformation.');
            }

        } catch (e) {
            console.error('Error:', e.message);
        }
    });
});
