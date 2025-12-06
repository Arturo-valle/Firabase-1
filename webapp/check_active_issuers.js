// No need for node-fetch in Node 18+
async function getActiveIssuers() {
    try {
        console.log('Fetching issuers...');
        const response = await fetch('https://us-central1-mvp-nic-market.cloudfunctions.net/api/issuers');
        const data = await response.json();

        if (!data.issuers) {
            console.log('No issuers found in response');
            return;
        }

        const activeIssuers = data.issuers.filter(issuer => issuer.documents && issuer.documents.length > 0);

        console.log(`\nFound ${activeIssuers.length} active issuers (with documents):`);
        console.log('------------------------------------------------');
        activeIssuers.forEach((issuer, index) => {
            console.log(`${index + 1}. ${issuer.name} (${issuer.documents.length} docs)`);
        });
        console.log('------------------------------------------------');
    } catch (error) {
        console.error('Error:', error);
    }
}

getActiveIssuers();
