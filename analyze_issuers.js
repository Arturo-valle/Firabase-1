const fs = require('fs');

// Read the issuers data
const jsonData = JSON.parse(fs.readFileSync('issuers_list.json', 'utf8'));
const data = jsonData.issuers || jsonData;

if (!Array.isArray(data)) {
    console.error('Error: Data is not an array');
    process.exit(1);
}

// Analyze issuers
const analysis = {
    total: data.length,
    withDocuments: 0,
    withoutDocuments: 0,
    processed: 0,
    unprocessed: 0,
    byDocumentCount: {},
    highPriority: [],
    mediumPriority: [],
    lowPriority: []
};

data.forEach(issuer => {
    const docCount = issuer.documents?.length || 0;
    const displayName = issuer.displayName || issuer.name;

    if (docCount > 0) {
        analysis.withDocuments++;
    } else {
        analysis.withoutDocuments++;
    }

    if (issuer.documentsProcessed > 0) {
        analysis.processed++;
    } else {
        analysis.unprocessed++;
    }

    // Count by document range
    if (docCount === 0) {
        analysis.byDocumentCount['0'] = (analysis.byDocumentCount['0'] || 0) + 1;
    } else if (docCount <= 5) {
        analysis.byDocumentCount['1-5'] = (analysis.byDocumentCount['1-5'] || 0) + 1;
    } else if (docCount <= 10) {
        analysis.byDocumentCount['6-10'] = (analysis.byDocumentCount['6-10'] || 0) + 1;
    } else if (docCount <= 20) {
        analysis.byDocumentCount['11-20'] = (analysis.byDocumentCount['11-20'] || 0) + 1;
    } else {
        analysis.byDocumentCount['20+'] = (analysis.byDocumentCount['20+'] || 0) + 1;
    }

    // Categorize by priority based on document count and type
    const hasFinancialDocs = issuer.documents?.some(doc =>
        doc.type?.toLowerCase().includes('financiero') ||
        doc.title?.toLowerCase().includes('financiero') ||
        doc.title?.toLowerCase().includes('auditado')
    );

    const entry = {
        id: issuer.id,
        name: displayName,
        docCount: docCount,
        processed: issuer.documentsProcessed || 0,
        hasFinancialDocs
    };

    if (docCount >= 10 && hasFinancialDocs) {
        analysis.highPriority.push(entry);
    } else if (docCount >= 5 && hasFinancialDocs) {
        analysis.mediumPriority.push(entry);
    } else if (docCount > 0) {
        analysis.lowPriority.push(entry);
    }
});

// Sort by document count
analysis.highPriority.sort((a, b) => b.docCount - a.docCount);
analysis.mediumPriority.sort((a, b) => b.docCount - a.docCount);
analysis.lowPriority.sort((a, b) => b.docCount - a.docCount);

console.log('📊 ISSUER ANALYSIS REPORT');
console.log('='.repeat(80));
console.log(`\n📈 Overall Statistics:`);
console.log(`  Total Issuers: ${analysis.total}`);
console.log(`  With Documents: ${analysis.withDocuments}`);
console.log(`  Without Documents: ${analysis.withoutDocuments}`);
console.log(`  Already Processed: ${analysis.processed}`);
console.log(`  Not Yet Processed: ${analysis.unprocessed}`);

console.log(`\n📊 Document Count Distribution:`);
Object.entries(analysis.byDocumentCount).sort().forEach(([range, count]) => {
    console.log(`  ${range.padEnd(8)}: ${count} issuers`);
});

console.log(`\n🥇 HIGH PRIORITY (${analysis.highPriority.length}): 10+ docs with financial statements`);
analysis.highPriority.forEach(issuer => {
    console.log(`  • ${issuer.name.substring(0, 50).padEnd(50)} | Docs: ${issuer.docCount} | Processed: ${issuer.processed}`);
});

console.log(`\n🥈 MEDIUM PRIORITY (${analysis.mediumPriority.length}): 5-9 docs with financial statements`);
analysis.mediumPriority.slice(0, 10).forEach(issuer => {
    console.log(`  • ${issuer.name.substring(0, 50).padEnd(50)} | Docs: ${issuer.docCount} | Processed: ${issuer.processed}`);
});

console.log(`\n🥉 LOW PRIORITY (${analysis.lowPriority.length}): <5 docs or no financial statements`);
console.log(`  (Top 10 shown)`);
analysis.lowPriority.slice(0, 10).forEach(issuer => {
    console.log(`  • ${issuer.name.substring(0, 50).padEnd(50)} | Docs: ${issuer.docCount} | Processed: ${issuer.processed}`);
});

// Save processing list
const toProcess = {
    high: analysis.highPriority.map(i => i.id),
    medium: analysis.mediumPriority.map(i => i.id),
    low: analysis.lowPriority.map(i => i.id)
};

fs.writeFileSync('issuers_to_process.json', JSON.stringify(toProcess, null, 2));
console.log(`\n✅ Processing list saved to: issuers_to_process.json`);
console.log(`\n📋 Recommended Action Plan:`);
console.log(`  1. Process ${analysis.highPriority.length} HIGH priority issuers`);
console.log(`  2. Process ${analysis.mediumPriority.length} MEDIUM priority issuers`);
console.log(`  3. Skip LOW priority for now (mostly single documents or non-financial)`);
