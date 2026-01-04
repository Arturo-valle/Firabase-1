const functions = require("firebase-functions");
const { generateFinancialAnalysis: callVertexAI } = require('../services/vertexAI');
const { handleRAGQuery, handleComparativeAnalysis, handleInsights } = require("../api/ragQuery");
const { diagnoseVertex } = require('../tasks/diagnoseVertex');
const syncFirestoreConfig = require('../tasks/syncFirestoreConfig');

// Constants for News Generation
const { WHITELIST } = require('../utils/issuerConfig');

const { getFirestore } = require('firebase-admin/firestore');

// L1 Cache (Memory)
let newsCache = {
    data: null,
    timestamp: 0,
    TTL: 10 * 60 * 1000 // 10 minutes
};

exports.queryAI = handleRAGQuery;
exports.compareAI = handleComparativeAnalysis;
exports.getInsights = handleInsights;
exports.debugVertex = (req, res) => {
    if (process.env.NODE_ENV === 'production' && !process.env.DEBUG_ENABLED) {
        return res.status(403).json({ error: "Access denied" });
    }
    return diagnoseVertex(req, res);
};

exports.syncConfig = async (req, res) => {
    // Basic security check for production
    if (process.env.NODE_ENV === 'production' && !process.env.DEBUG_ENABLED) {
        return res.status(403).json({ error: "Access denied" });
    }
    try {
        await syncFirestoreConfig();
        res.json({ success: true, message: "Configuration synced to Firestore" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getMarketNews = async (req, res) => {
    try {
        const now = Date.now();

        // 1. Check L1 Cache (Memory)
        if (newsCache.data && (now - newsCache.timestamp < newsCache.TTL)) {
            functions.logger.info("Serving market news from L1 Memory Cache");
            return res.json({ success: true, ...newsCache.data, source: 'cache_l1' });
        }

        const db = getFirestore();
        const cacheRef = db.collection('cache_news').doc('market_overview');

        // 2. Check L2 Cache (Firestore)
        const cacheDoc = await cacheRef.get();
        const L2_TTL = 60 * 60 * 1000; // 1 hour

        if (cacheDoc.exists) {
            const cacheData = cacheDoc.data();
            const cacheAge = now - cacheData.generatedAt.toMillis();

            if (cacheAge < L2_TTL) {
                functions.logger.info("Serving market news from L2 Firestore Cache");

                // Update L1
                newsCache = {
                    data: cacheData.payload,
                    timestamp: now
                };

                return res.json({ success: true, ...cacheData.payload, source: 'cache_l2' });
            }
        }

        // 3. Generate New Content (Cache Miss)
        functions.logger.info("Generating new market news via Vertex AI");
        const prompt = `
            Genera 5 noticias financieras breves y relevantes sobre el mercado de valores de Nicaragua, 
            basadas en los siguientes emisores activos: ${WHITELIST.join(', ')}.
            Enfócate en hechos recientes, análisis de sector y tendencias.
            Formato JSON: { "newsItems": [{ "title": "...", "summary": "...", "publishedAt": "YYYY-MM-DD", "category": "market", "relatedIssuers": ["..."], "sentiment": "positive" }] }
        `;

        const text = await callVertexAI(prompt, { temperature: 0.2 });
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const newsData = JSON.parse(jsonStr);

        // 4. Update Caches
        // Update L1
        newsCache = {
            data: newsData,
            timestamp: now
        };

        // Update L2
        await cacheRef.set({
            payload: newsData,
            generatedAt: new Date(), // Firestore Timestamp
            expiresAt: new Date(now + L2_TTL)
        });

        res.json({ success: true, ...newsData, source: 'generated' });

    } catch (error) {
        functions.logger.error("Error generating AI news:", error);

        // Fallback: Serve stale cache if available
        if (newsCache.data) {
            functions.logger.warn("Serving stale L1 cache due to error");
            return res.json({ success: true, ...newsCache.data, source: 'cache_l1_stale', warning: 'Content might be outdated' });
        }

        res.status(500).json({ success: false, error: "Failed to generate news" });
    }
};

