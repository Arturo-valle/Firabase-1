const axios = require('axios');
const functions = require('firebase-functions');
const { GoogleAuth } = require('google-auth-library');
const { VertexAI } = require('@google-cloud/vertexai');

async function diagnoseVertex(req, res) {
    const results = {
        timestamp: new Date().toISOString(),
        projectId: 'mvp-nic-market',
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
        const client = await auth.getClient();
        results.scopes = client.scopes || 'unknown';
        const accessToken = await client.getAccessToken();
        const token = accessToken.token;

        // 3. List Locations (REST)
        try {
            const locUrl = `https://aiplatform.googleapis.com/v1/projects/${results.projectId}/locations`;
            const locRes = await axios.get(locUrl, { headers: { 'Authorization': `Bearer ${token}` } });
            results.tests.listLocations = { success: true, count: locRes.data.locations?.length || 0 };
        } catch (e) {
            results.tests.listLocations = { success: false, error: e.message, status: e.response?.status };
        }

        // 4. Test Standard Model (gemini-1.5-flash) in us-central1
        try {
            const v1 = new VertexAI({ project: results.projectId, location: 'us-central1' });
            const m1 = v1.getGenerativeModel({ model: 'gemini-1.5-flash' });
            await m1.generateContent('Hi');
            results.tests.standardModel = { success: true, model: 'gemini-1.5-flash', location: 'us-central1' };
        } catch (e) {
            results.tests.standardModel = { success: false, error: e.message };
        }

        // 5. Test User Model (gemini-2.5-flash-lite) in us-central1
        try {
            const v2 = new VertexAI({ project: results.projectId, location: 'us-central1' });
            const m2 = v2.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
            await m2.generateContent('Hi');
            results.tests.userModel = { success: true, model: 'gemini-2.5-flash-lite', location: 'us-central1' };
        } catch (e) {
            results.tests.userModel = { success: false, error: e.message };
        }

        res.json(results);
    } catch (error) {
        functions.logger.error('Diagnostic error:', error);
        res.status(500).json({ error: error.message, stack: error.stack, partialResults: results });
    }
}

module.exports = { diagnoseVertex };
