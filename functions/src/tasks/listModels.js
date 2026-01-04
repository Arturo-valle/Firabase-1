const { GoogleGenAI } = require('@google/genai');
const functions = require('firebase-functions');

async function listModels(req, res) {
    try {
        const client = new GoogleGenAI({
            vertexAI: true,
            project: process.env.GCLOUD_PROJECT || 'mvp-nic-market',
            location: 'us-central1'
        });

        // The SDK doesn't have a direct listModels for Vertex AI in this version easily accessible
        // but we can try to "get" several known names and see which one doesn't 404.
        const modelsToTest = [
            'gemini-1.5-flash',
            'gemini-1.5-flash-001',
            'gemini-1.5-flash-002',
            'gemini-1.5-pro',
            'gemini-2.0-flash-exp'
        ];

        const results = {};

        for (const modelId of modelsToTest) {
            try {
                // Try a very simple generation to see if it works
                const model = client.getGenerativeModel({ model: modelId });
                const result = await model.generateContent("Respond 'OK'");
                results[modelId] = { status: 'Available', response: result.response.text() };
            } catch (error) {
                results[modelId] = { status: 'Error', message: error.message };
            }
        }

        res.json({
            success: true,
            project: process.env.GCLOUD_PROJECT || 'mvp-nic-market',
            location: 'us-central1',
            results
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

module.exports = listModels;
