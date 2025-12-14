const fetch = require('node-fetch');

async function testMultipleIssuers() {
    const issuers = ['fama', 'banco de la produccion', 'banco de finanzas'];

    for (const issuer of issuers) {
        console.log(`\n${'='.repeat(80)}`);
        console.log(`🔍 Testing Issuer: ${issuer.toUpperCase()}`);
        console.log('='.repeat(80));

        try {
            const response = await fetch('https://us-central1-mvp-nic-market.cloudfunctions.net/api/ai/query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: '¿Cuáles son los principales indicadores financieros?',
                    issuerId: issuer.toLowerCase().replace(/ /g, ' '),
                    analysisType: 'financial'
                })
            });

            const result = await response.json();

            if (response.status === 200 && result.metadata) {
                console.log('✅ Status: SUCCESS');
                console.log(`📊 Chunks Analyzed: ${result.metadata.totalChunksAnalyzed}`);
                console.log(`📄 Unique Documents: ${result.metadata.uniqueDocumentCount}`);
                console.log(`📅 Years: ${result.metadata.yearsFound.join(', ')}`);
                console.log('\n📚 Document Types:');
                result.metadata.uniqueDocuments.forEach(doc => {
                    console.log(`  • ${doc.title.substring(0, 60)}...`);
                });
            } else {
                console.log(`❌ Status: ${response.status}`);
                console.log(`Error: ${result.message || result.error}`);
            }
        } catch (error) {
            console.log(`❌ Error: ${error.message}`);
        }

        // Wait 3 seconds between queries
        await new Promise(resolve => setTimeout(resolve, 3000));
    }

    console.log(`\n${'='.repeat(80)}`);
    console.log('✨ All tests completed!');
    console.log('='.repeat(80));
}

testMultipleIssuers();
