const fetch = require('node-fetch');

async function testProductionQuery() {
    console.log('\n' + '='.repeat(80));
    console.log('🔍 PRODUCTION QUERY TEST - Simulating Frontend Request');
    console.log('='.repeat(80));

    // Simulate the exact query from the screenshot
    const query = "Cuales son los principales ratios financieros 2024";
    const frontenId = "corporación_agricola"; // Frontend ID (with underscore and tilde)

    // Normalize ID (same function as in AIAnalysis.tsx)
    const normalizeIssuerId = (id) => {
        return id
            .replace(/_/g, ' ')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim();
    };

    const backendId = normalizeIssuerId(frontenId);

    console.log(`\n📊 Testing Query:`);
    console.log(`   Original Frontend ID: "${frontenId}"`);
    console.log(`   Normalized Backend ID: "${backendId}"`);
    console.log(`   Query: "${query}"`);

    try {
        const response = await fetch('https://us-central1-mvp-nic-market.cloudfunctions.net/api/ai/query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: query,
                issuerId: backendId,
                analysisType: 'financial'
            })
        });

        const result = await response.json();

        console.log(`\n✅ HTTP Status: ${response.status}`);

        if (response.status === 200) {
            console.log(`📊 Chunks Analyzed: ${result.metadata?.totalChunksAnalyzed || 0}`);
            console.log(`📄 Documents Used: ${result.metadata?.uniqueDocumentCount || 0}`);
            console.log(`📅 Years Covered: ${result.metadata?.yearsFound?.join(', ') || 'N/A'}`);

            console.log('\n🤖 AI Response Preview (first 500 chars):');
            console.log('-'.repeat(80));
            console.log(result.answer.substring(0, 500));
            console.log('-'.repeat(80));

            if (result.metadata?.uniqueDocuments) {
                console.log('\n📚 Source Documents:');
                result.metadata.uniqueDocuments.forEach((doc, idx) => {
                    console.log(`  ${idx + 1}. [${doc.date || 'N/A'}] ${doc.title.substring(0, 60)}...`);
                });
            }

            console.log('\n✅ TEST PASSED - Query returned valid results!');
        } else {
            console.log(`❌ TEST FAILED - Status: ${response.status}`);
            console.log(`Error: ${result.error || result.message || JSON.stringify(result)}`);
        }
    } catch (error) {
        console.log(`❌ TEST FAILED - Exception: ${error.message}`);
    }

    console.log('\n' + '='.repeat(80));
}

testProductionQuery();
