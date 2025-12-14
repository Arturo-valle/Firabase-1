const fetch = require('node-fetch');

async function checkFDLExtraction() {
    console.log('Triggering FDL extraction...');
    try {
        const response = await fetch('https://us-central1-mvp-nic-market.cloudfunctions.net/api/metrics/extract/financiera-fdl', {
            method: 'POST'
        });

        const data = await response.json();
        console.log('Extraction Result:');
        console.log(JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error:', error);
    }
}

checkFDLExtraction();
