const { generateFinancialAnalysis } = require('./src/services/vertexAI');
const functions = require('firebase-functions');

async function test() {
    process.env.GCLOUD_PROJECT = 'mvp-nic-market';
    console.log('🧪 Testing vertexAI.js with gemini-2.0-flash-exp...');
    try {
        const result = await generateFinancialAnalysis('Hola, ¿quién eres?');
        console.log('✅ Result:', result);
    } catch (e) {
        console.error('❌ Failed:', e.message);
    }
}

test();
