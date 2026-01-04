const { VertexAI } = require('@google-cloud/vertexai');
const admin = require('firebase-admin');

// Load service account (assumed to act as Application Default Credentials or manual auth)
try {
    const serviceAccount = require('./debug/serviceAccountKey.json');
    // Set env var for Google Auth
    process.env.GOOGLE_APPLICATION_CREDENTIALS = './scripts/debug/serviceAccountKey.json';
} catch (e) {
    console.log("No serviceAccountKey.json found, relying on Environment Auth");
}

async function testModel(modelName) {
    console.log(`\nTesting Model: ${modelName}...`);
    try {
        const vertexAI = new VertexAI({
            project: 'mvp-nic-market',
            location: 'us-central1',
        });

        const generativeModel = vertexAI.preview.getGenerativeModel({
            model: modelName,
        });

        const request = {
            contents: [{ role: 'user', parts: [{ text: "Hello, are you working?" }] }],
        };

        const result = await generativeModel.generateContent(request);
        const response = result.response;
        console.log(`✅ Success! Response: ${response.candidates[0].content.parts[0].text.trim()}`);
        return true;
    } catch (error) {
        console.error(`❌ Failed: ${error.message}`);
        return false;
    }
}

async function runTests() {
    const models = [
        'gemini-1.5-flash-001',
        'gemini-1.5-pro-001',
        'gemini-1.0-pro-001',
        'gemini-pro'
    ];

    for (const model of models) {
        await testModel(model);
    }
}

runTests();
