const fetch = require('node-fetch');

async function testEnhancedQuery() {
    try {
        console.log('🔍 Testing Enhanced AI Query...\n');
        const response = await fetch('https://us-central1-mvp-nic-market.cloudfunctions.net/api/ai/query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: 'Analiza los ratios de liquidez y solvencia de FAMA basándote en los estados financieros disponibles',
                issuerId: 'fama',
                analysisType: 'financial'
            })
        });

        const result = await response.json();
        console.log('📊 Response status:', response.status);
        console.log('═'.repeat(80));

        if (response.status === 200) {
            console.log('✅ SUCCESS! Enhanced Analysis:\n');

            if (result.metadata) {
                console.log('📈 METADATA:');
                console.log('  - Total Chunks Analyzed:', result.metadata.totalChunksAnalyzed);
                console.log('  - Unique Documents:', result.metadata.uniqueDocumentCount);
                console.log('  - Years Found:', result.metadata.yearsFound.join(', '));
                console.log('\n📄 Documents Used:');
                result.metadata.uniqueDocuments.forEach((doc, i) => {
                    console.log(`  ${i + 1}. ${doc.title}`);
                    console.log(`     Type: ${doc.type}`);
                    console.log(`     Date: ${doc.date}`);
                    console.log(`     Chunks: ${doc.chunkCount}`);
                });
            }

            console.log('\n💡 ANALYSIS:');
            console.log(result.answer.substring(0, 500) + '...\n');
        } else {
            console.log('❌ FAILED. Response:');
            console.log(JSON.stringify(result, null, 2));
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testEnhancedQuery();
