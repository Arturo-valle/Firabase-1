const axios = require('axios');
const functions = require('firebase-functions');
const { GoogleAuth } = require('google-auth-library');
const { GoogleGenAI } = require('@google/genai');

async function diagnoseVertex(req, res) {
    const results = {
        timestamp: new Date().toISOString(),
        projectId: 'mvp-nic-market',
        location: 'global',
        identity: null,
        scopes: null,
        tests: {}
    };

    try {
        // 1. Check Identity (Metadata Server)
        try {
            const metadataRes = await axios.get(
                'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/email',
                { headers: { 'Metadata-Flavor': 'Google' } }
            );
            results.identity = metadataRes.data;
        } catch (e) {
            results.identity = `Error: ${e.message}`;
        }

        // 2. Auth & Scopes
        const auth = new GoogleAuth({
            scopes: 'https://www.googleapis.com/auth/cloud-platform'
        });
        const authClient = await auth.getClient();
        results.scopes = authClient.scopes || 'unknown';
        const accessToken = await authClient.getAccessToken();
        const token = accessToken.token;

        // 3. List Locations (REST) - Verificación de conectividad base
        try {
            const locUrl = `https://aiplatform.googleapis.com/v1/projects/${results.projectId}/locations`;
            const locRes = await axios.get(locUrl, { headers: { 'Authorization': `Bearer ${token}` } });
            results.tests.listLocations = { success: true, count: locRes.data.locations?.length || 0 };
        } catch (e) {
            results.tests.listLocations = { success: false, error: e.message, status: e.response?.status };
        }

        // 4. Test Gemini 2.0 Flash Exp con @google/genai (Global Endpoint)
        try {
            const client = new GoogleGenAI({
                vertexai: true,
                project: results.projectId,
                location: 'global'
            });


            const response = await client.models.generateContent({
                model: 'gemini-2.0-flash-exp',
                contents: [{ role: 'user', parts: [{ text: 'Hola, responde con "OK"' }] }]
            });

            results.tests.gemini2flashExp = {
                success: true,
                model: 'gemini-2.0-flash-exp',
                location: 'global',
                response: response.text.trim()
            };
        } catch (e) {
            results.tests.gemini3flashPreview = { success: false, error: e.message };
        }

        res.json(results);
    } catch (error) {
        functions.logger.error('Diagnostic error:', error);
        res.status(500).json({ error: error.message, stack: error.stack, partialResults: results });
    }
}

module.exports = { diagnoseVertex };


module.exports = { diagnoseVertex };
