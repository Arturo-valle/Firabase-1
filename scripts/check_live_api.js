const https = require('https');

const url = 'https://api-os3qsxfz6q-uc.a.run.app/issuers';

console.log(`Fetching from: ${url}`);

https.get(url, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            const issuers = json.issuers || [];
            console.log(`\n✅ HTTP Status: ${res.statusCode}`);
            console.log(`📊 Total Issuers Returned: ${issuers.length}`);
            console.log(`🔍 IDs found: ${issuers.map(i => i.id).join(', ')}`);
            console.log(`🏷️  Names found: ${issuers.map(i => i.name).join(', ')}`);
            console.log(`⚙️  Source: ${json.source}`);

            // Check active status
            const inactive = issuers.filter(i => i.active === false);
            if (inactive.length > 0) {
                console.log(`⚠️ Inactive Issuers: ${inactive.map(i => i.id).join(', ')}`);
            } else {
                console.log('✨ All issuers are active (or active not explicit false)');
            }

        } catch (e) {
            console.error('❌ Failed to parse JSON:', e.message);
            console.log('Raw Data Snippet:', data.substring(0, 500));
        }
    });

}).on('error', (err) => {
    console.error('❌ Error:', err.message);
});
