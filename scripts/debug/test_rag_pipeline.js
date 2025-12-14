// Direct RAG API test script
const https = require('https');

function makeRAGQuery(query, issuerIds, analysisType = 'comparative') {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            query: query,
            issuerId: issuerIds,
            analysisType: analysisType
        });

        const options = {
            hostname: 'us-central1-mvp-nic-market.cloudfunctions.net',
            path: '/api/ai/query',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            },
            timeout: 120000 // 2 minutes
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(data) });
                } catch (e) {
                    resolve({ status: res.statusCode, data: { raw: data, parseError: e.message } });
                }
            });
        });

        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });

        req.write(postData);
        req.end();
    });
}

async function testRAG() {
    console.log('🧪 RAG PIPELINE END-TO-END TEST\n');
    console.log('='.repeat(80));

    // Test 1: Single Issuer Financial Analysis
    console.log('\n📊 TEST 1: Single Issuer Analysis');
    console.log('-'.repeat(80));
    try {
        const result1 = await makeRAGQuery(
            '¿Cuál es la situación financiera actual de este banco? Analiza su liquidez, solvencia y rentabilidad.',
            'banco de finanzas',
            'financial'
        );

        console.log(`Status: ${result1.status}`);
        if (result1.status === 200) {
            console.log('✅ SUCCESS\n');
            console.log('Answer Length:', result1.data.answer?.length || 0, 'chars');
            console.log('Chunks Analyzed:', result1.data.metadata?.totalChunksAnalyzed || 0);
            console.log('Unique Docs:', result1.data.metadata?.uniqueDocumentCount || 0);
            console.log('\nFirst 500 chars of answer:');
            console.log(result1.data.answer?.substring(0, 500) || 'No answer');
        } else {
            console.log('❌ FAILED');
            console.log('Error:', JSON.stringify(result1.data, null, 2));
        }
    } catch (e) {
        console.log('❌ ERROR:', e.message);
    }

    // Test 2: Comparative Analysis
    console.log('\n\n📊 TEST 2: Comparative Analysis (Multiple Issuers)');
    console.log('-'.repeat(80));
    try {
        const result2 = await makeRAGQuery(
            'Compara los ratios de liquidez de estos dos bancos y dime cuál tiene mejor capacidad de pago a corto plazo',
            ['banco de finanzas', 'fama'],
            'comparative'
        );

        console.log(`Status: ${result2.status}`);
        if (result2.status === 200) {
            console.log('✅ SUCCESS\n');
            console.log('Answer Length:', result2.data.answer?.length || 0, 'chars');
            console.log('Chunks Analyzed:', result2.data.metadata?.totalChunksAnalyzed || 0);
            console.log('Unique Docs:', result2.data.metadata?.uniqueDocumentCount || 0);
            console.log('\nFirst 500 chars of answer:');
            console.log(result2.data.answer?.substring(0, 500) || 'No answer');
        } else {
            console.log('❌ FAILED');
            console.log('Error:', JSON.stringify(result2.data, null, 2));
        }
    } catch (e) {
        console.log('❌ ERROR:', e.message);
    }

    // Test 3: Credit Rating Query
    console.log('\n\n📊 TEST 3: Credit Rating Analysis');
    console.log('-'.repeat(80));
    try {
        const result3 = await makeRAGQuery(
            '¿Cuál es la calificación de riesgo actual de este banco y cuáles son los factores que la respaldan?',
            'fama',
            'creditRating'
        );

        console.log(`Status: ${result3.status}`);
        if (result3.status === 200) {
            console.log('✅ SUCCESS\n');
            console.log('Answer Length:', result3.data.answer?.length || 0, 'chars');
            console.log('Chunks Analyzed:', result3.data.metadata?.totalChunksAnalyzed || 0);
            console.log('Unique Docs:', result3.data.metadata?.uniqueDocumentCount || 0);
            console.log('\nFirst 500 chars of answer:');
            console.log(result3.data.answer?.substring(0, 500) || 'No answer');
        } else {
            console.log('❌ FAILED');
            console.log('Error:', JSON.stringify(result3.data, null, 2));
        }
    } catch (e) {
        console.log('❌ ERROR:', e.message);
    }

    console.log('\n' + '='.repeat(80));
    console.log('🎯 RAG PIPELINE TEST COMPLETE\n');
}

testRAG().catch(console.error);
