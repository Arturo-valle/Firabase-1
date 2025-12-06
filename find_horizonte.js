const fs = require('fs');

try {
    const rawData = fs.readFileSync('issuers_list.json', 'utf8');
    const jsonData = JSON.parse(rawData);
    const issuers = jsonData.issuers || jsonData;

    const found = issuers.find(i =>
        (i.name && i.name.toLowerCase().includes('horizonte')) ||
        (i.id && i.id.toLowerCase().includes('horizonte'))
    );

    if (found) {
        console.log('Found Horizonte:');
        console.log(JSON.stringify(found, null, 2));
    } else {
        console.log('Horizonte NOT found in JSON parsing.');
    }

} catch (e) {
    console.error(e);
}
