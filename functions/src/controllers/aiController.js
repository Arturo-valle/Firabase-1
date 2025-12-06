const functions = require("firebase-functions");
const { VertexAI } = require('@google-cloud/vertexai');
const { handleRAGQuery, handleComparativeAnalysis, handleInsights } = require("../api/ragQuery");
const { diagnoseVertex } = require('../tasks/diagnoseVertex');

// Constants for News Generation
const WHITELIST = ["agricorp", "banpro", "bdf", "fama", "fdl", "fid", "horizonte"];

exports.queryAI = handleRAGQuery;
exports.compareAI = handleComparativeAnalysis;
exports.getInsights = handleInsights;
exports.debugVertex = diagnoseVertex;

exports.getMarketNews = async (req, res) => {
    try {
        const vertex_ai = new VertexAI({ project: 'mvp-nic-market', location: 'us-central1' });
        const model = 'gemini-1.5-flash-001';
        const generativeModel = vertex_ai.preview.getGenerativeModel({
            model: model,
            generationConfig: { maxOutputTokens: 2048, temperature: 0.2, topP: 0.8, topK: 40 }
        });

        const prompt = `
            Genera 5 noticias financieras breves y relevantes sobre el mercado de valores de Nicaragua, 
            basadas en los siguientes emisores activos: ${WHITELIST.join(', ')}.
            Enfócate en hechos recientes, análisis de sector y tendencias.
            Formato JSON: { "newsItems": [{ "title": "...", "summary": "...", "publishedAt": "YYYY-MM-DD", "category": "market", "relatedIssuers": ["..."], "sentiment": "positive" }] }
        `;

        const reqAI = { contents: [{ role: 'user', parts: [{ text: prompt }] }] };
        const streamingResp = await generativeModel.generateContentStream(reqAI);
        const aggregatedResponse = await streamingResp.response;
        const text = aggregatedResponse.candidates[0].content.parts[0].text;
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const newsData = JSON.parse(jsonStr);

        res.json({ success: true, ...newsData });
    } catch (error) {
        functions.logger.error("Error generating AI news:", error);
        res.status(500).json({ success: false, error: "Failed to generate news" });
    }
};
