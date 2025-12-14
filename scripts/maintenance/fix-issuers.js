const https = require('https');
const fs = require('fs');

const url = 'https://us-central1-mvp-nic-market.cloudfunctions.net/api/issuers';
const dest = './webapp/src/issuers.json';

console.log('Downloading issuers from API...');

https.get(url, (res) => {
    if (res.statusCode !== 200) {
        console.error(`Failed to download: HTTP ${res.statusCode}`);
        process.exit(1);
    }

    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            // Validate JSON
            const parsed = JSON.parse(data);
            console.log(`✓ Downloaded ${parsed.length} issuers`);

            // Write to file
            fs.writeFileSync(dest, JSON.stringify(parsed, null, 2));
            console.log(`✓ Saved to ${dest}`);
            console.log(`✓ File size: ${fs.statSync(dest).size} bytes`);
            process.exit(0);
        } catch (err) {
            console.error('Error parsing JSON:', err.message);
            process.exit(1);
        }
    });
}).on('error', (err) => {
    console.error('Download error:', err.message);
    process.exit(1);
});
