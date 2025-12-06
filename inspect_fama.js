
const fs = require('fs');

const data = JSON.parse(fs.readFileSync('issuers_list.json', 'utf8'));
const famaIssuers = data.issuers.filter(i =>
    (i.name && i.name.toUpperCase().includes('FAMA')) ||
    (i.id && i.id.toUpperCase().includes('FAMA'))
);

console.log('Found FAMA issuers:', famaIssuers.length);
famaIssuers.forEach(i => {
    console.log(`ID: "${i.id}", Name: "${i.name}", Docs: ${i.documents ? i.documents.length : 0}`);
});
