const fs = require('fs');

// Read the current issuers.json
const data = fs.readFileSync('./webapp/src/issuers.json', 'utf8');
const parsed = JSON.parse(data);

// Check if it's wrapped in an object with {issuers: [...]}
let issuersArray;
if (Array.isArray(parsed)) {
    issuersArray = parsed;
    console.log('✓ Already an array');
} else if (parsed.issuers && Array.isArray(parsed.issuers)) {
    issuersArray = parsed.issuers;
    console.log('✓ Extracted from {issuers: [...]} wrapper');
} else {
    console.error('✗ Unexpected format');
    process.exit(1);
}

// Write back as array
fs.writeFileSync('./webapp/src/issuers.json', JSON.stringify(issuersArray, null, 2));
console.log(`✓ Saved ${issuersArray.length} issuers as array`);
console.log(`✓ File size: ${fs.statSync('./webapp/src/issuers.json').size} bytes`);
