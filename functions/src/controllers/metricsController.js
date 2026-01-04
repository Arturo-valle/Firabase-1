const functions = require("firebase-functions");
const { getFirestore } = require("firebase-admin/firestore");
const { compareIssuerMetrics, extractIssuerMetrics, getIssuerMetrics, getIssuerHistory, extractHistoricalMetrics } = require('../services/metricsExtractor');
const { scrapeBcnRates } = require("../scrapers/getBcnRates");

functions.logger.info("Metrics Controller v2.0 - Loaded");

const db = getFirestore();

const CACHE_TTL = 30 * 60 * 1000; // 30 minutes
const metricsCache = new Map();
const historyCache = new Map();

exports.getBcnRates = async (req, res) => {
    try {
        const rates = await scrapeBcnRates();
        res.set("Cache-Control", "public, max-age=3600, s-maxage=3600");
        res.status(200).json(rates);
    } catch (error) {
        functions.logger.error("Error in /bcn endpoint:", error);
        res.status(500).send("Failed to fetch BCN exchange rates.");
    }
};

exports.getIssuerHistory = async (req, res) => {
    try {
        const { issuerId } = req.params;
        const cacheKey = `history_${issuerId}`;
        const now = Date.now();

        // Check Cache
        if (historyCache.has(cacheKey)) {
            const cached = historyCache.get(cacheKey);
            if (now - cached.timestamp < CACHE_TTL) {
                functions.logger.info(`Serving history from cache for: ${issuerId}`);
                return res.json(cached.data);
            }
        }

        functions.logger.info(`API request for history of ID: ${issuerId}`);
        const history = await getIssuerHistory(issuerId);

        // Update Cache
        historyCache.set(cacheKey, { data: history, timestamp: now });

        res.json(history);
    } catch (error) {
        functions.logger.error("Error getting issuer history:", error);
        res.status(500).json({ error: error.message });
    }
};

exports.compareMetrics = async (req, res) => {
    // ... logic remains same ...
    // Note: Comparison could be cached, but combinations are high variance.
    // Leaving uncached for now or relying on underlying service cache if implemented.
    try {
        let { issuerIds } = req.body;
        if (!issuerIds || !Array.isArray(issuerIds)) {
            return res.status(400).json({ error: "issuerIds array is required" });
        }

        // Sanitize and validate issuer IDs
        issuerIds = issuerIds
            .filter(id => typeof id === 'string')
            .map(id => id.replace(/[<>]/g, '').trim())
            .filter(id => id.length > 0);

        if (issuerIds.length === 0) {
            return res.status(400).json({ error: "No valid issuer IDs provided" });
        }

        const comparison = await compareIssuerMetrics(issuerIds);
        res.json({ success: true, comparison });
    } catch (error) {
        functions.logger.error("Error comparing metrics:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.extractMetrics = async (req, res) => {
    const { issuerId } = req.params;
    try {
        const issuerDoc = await db.collection("issuers").doc(issuerId).get();
        if (!issuerDoc.exists) return res.status(404).json({ error: "Issuer not found" });

        const issuerName = issuerDoc.data().name;
        const metrics = await extractIssuerMetrics(issuerId, issuerName);

        // Invalidate cache on new extraction
        metricsCache.delete(`metrics_${issuerId}`);

        res.json({ success: true, metrics });
    } catch (error) {
        functions.logger.error(`Error extracting metrics for ${issuerId}:`, error);
        res.status(500).json({ error: error.message });
    }
};

exports.getMetrics = async (req, res) => {
    const { issuerId } = req.params;
    const cacheKey = `metrics_${issuerId}`;
    const now = Date.now();

    try {
        // Check Cache
        if (metricsCache.has(cacheKey)) {
            const cached = metricsCache.get(cacheKey);
            if (now - cached.timestamp < CACHE_TTL) {
                functions.logger.info(`Serving metrics from cache for: ${issuerId}`);
                return res.json({ success: true, metrics: cached.data });
            }
        }

        const metrics = await getIssuerMetrics(issuerId);
        if (!metrics) {
            return res.status(404).json({ error: "Metrics not found" });
        }

        // Update Cache
        metricsCache.set(cacheKey, { data: metrics, timestamp: now });

        res.json({ success: true, metrics });
    } catch (error) {
        functions.logger.error(`Error fetching metrics for ${issuerId}:`, error);
        res.status(500).json({ error: "Failed to fetch metrics" });
    }
};

exports.extractHistory = async (req, res) => {
    const { issuerId } = req.params;
    try {
        const issuerDoc = await db.collection("issuers").doc(issuerId).get();
        if (!issuerDoc.exists) return res.status(404).json({ error: "Issuer not found" });

        const issuerName = issuerDoc.data().name;

        functions.logger.info(`Extracting history for ${issuerId} (${issuerName})`);
        const history = await extractHistoricalMetrics(issuerId, issuerName);

        const count = Array.isArray(history) ? history.length : 0;
        functions.logger.info(`Extraction complete for ${issuerId}. Count: ${count}`);

        res.json({ success: true, count, history });
    } catch (error) {
        functions.logger.error(`Error extracting history for ${issuerId}:`, error);
        res.status(500).json({ error: error.message });
    }
};

exports.debugViewChunkText = async (req, res) => {
    if (process.env.NODE_ENV === 'production' && !process.env.DEBUG_ENABLED) {
        return res.status(403).json({ error: "Access denied" });
    }
    try {
        const { issuerId } = req.params;
        const db = getFirestore();

        let snap = await db.collection("documentChunks")
            .where("issuerId", "==", issuerId)
            .limit(5)
            .get();

        if (snap.empty) {
            // Fallback for tricky IDs like agricorp
            const candidates = ["corporaci-n-agricola", "agri-corp", "agricorp"];
            for (const c of candidates) {
                snap = await db.collection("documentChunks").where("issuerId", "==", c).limit(5).get();
                if (!snap.empty) break;
            }
        }

        const chunks = snap.docs.map(d => ({
            id: d.id,
            textLen: d.data().text ? d.data().text.length : 0,
            textPreview: d.data().text ? d.data().text.substring(0, 300) + "..." : "[NO TEXT]",
            metadata: d.data().metadata
        }));

        res.json({ count: chunks.length, chunks });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

/**
 * Debug endpoint to view recent chunks with full metadata
 * This helps diagnose why old documents are being prioritized
 */
exports.debugViewRecentChunks = async (req, res) => {
    if (process.env.NODE_ENV === 'production' && !process.env.DEBUG_ENABLED) {
        return res.status(403).json({ error: "Access denied" });
    }
    try {
        const { issuerId } = req.params;
        const db = getFirestore();

        // Get ALL chunks for this issuer to analyze
        const snap = await db.collection("documentChunks")
            .where("issuerId", "==", issuerId)
            .limit(100)
            .get();

        if (snap.empty) {
            return res.json({ error: "No chunks found", issuerId });
        }

        // Extract and analyze all chunks
        const allChunks = snap.docs.map(d => {
            const data = d.data();
            const md = data.metadata || {};
            return {
                id: d.id,
                documentTitle: md.documentTitle || md.title || 'Unknown',
                documentDate: md.documentDate || md.date || null,
                documentType: md.documentType || 'Unknown',
                isAudited: /auditado|estados financieros/i.test(md.documentTitle || ''),
                textPreview: (data.text || '').substring(0, 200),
                hasROEData: /roe|rentabilidad.*patrimonio|utilidad.*neta/i.test(data.text || ''),
                hasAssets: /activo.*total|total.*activo/i.test(data.text || ''),
                textLength: (data.text || '').length
            };
        });

        // Group by document and find unique documents
        const docMap = new Map();
        allChunks.forEach(c => {
            if (!docMap.has(c.documentTitle)) {
                docMap.set(c.documentTitle, {
                    title: c.documentTitle,
                    date: c.documentDate,
                    type: c.documentType,
                    isAudited: c.isAudited,
                    chunkCount: 0,
                    hasROEData: false,
                    hasAssets: false
                });
            }
            const doc = docMap.get(c.documentTitle);
            doc.chunkCount++;
            if (c.hasROEData) doc.hasROEData = true;
            if (c.hasAssets) doc.hasAssets = true;
        });

        const documents = Array.from(docMap.values())
            .sort((a, b) => {
                // Sort by date descending
                const dateA = a.date ? new Date(a.date).getTime() : 0;
                const dateB = b.date ? new Date(b.date).getTime() : 0;
                return dateB - dateA;
            });

        res.json({
            issuerId,
            totalChunks: allChunks.length,
            uniqueDocuments: documents.length,
            documents: documents.slice(0, 20), // Top 20 documents by date
            analysis: {
                newestDoc: documents[0]?.title || 'N/A',
                newestDate: documents[0]?.date || 'N/A',
                docsWithROEData: documents.filter(d => d.hasROEData).length,
                docsWithAssets: documents.filter(d => d.hasAssets).length
            }
        });
    } catch (e) {
        functions.logger.error("Error in debugViewRecentChunks:", e);
        res.status(500).json({ error: e.message });
    }
};

