const fetch = require('node-fetch');

async function testComparativeAnalysis() {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🔍 Testing Comparative Analysis: FAMA vs BANPRO vs BDF`);
    console.log('='.repeat(80));

    try {
        const response = await fetch('https://us-central1-mvp-nic-market.cloudfunctions.net/api/ai/query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: 'Compara la liquidez y solvencia de estos bancos en el último año disponible.',
                issuerId: ['fama', 'banco de la produccion', 'banco de finanzas'],
                analysisType: 'comparative'
            })
        });

        const result = await response.json();

        if (response.status === 200) {
            console.log('✅ Status: SUCCESS');
            console.log(`📊 Chunks Analyzed: ${result.metadata.totalChunksAnalyzed}`);
            console.log(`📄 Unique Documents: ${result.metadata.uniqueDocumentCount}`);
            console.log(`📅 Years: ${result.metadata.yearsFound.join(', ')}`);

            console.log('\n🤖 AI Answer Preview:');
            console.log('-'.repeat(40));
            console.log(result.answer.substring(0, 1000) + '...');
            console.log('-'.repeat(40));

            console.log('\n📚 Document Types:');
            result.metadata.uniqueDocuments.forEach(doc => {
                console.log(`  • [${doc.issuer || 'Unknown'}] ${doc.title.substring(0, 60)}...`);
            });
        } else {
            console.log(`❌ Status: ${response.status}`);
            console.log(`Error: ${result.message || result.error}`);
        }
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
    }
}

testComparativeAnalysis();
