const express = require('express');
const router = express.Router();

const issuersController = require('../controllers/issuersController');
const aiController = require('../controllers/aiController');
const metricsController = require('../controllers/metricsController');
const systemController = require('../controllers/systemController');
const { authMiddleware, optionalAuthMiddleware, adminMiddleware, apiLimiter } = require('../middleware/authMiddleware');

// --- Global Rate Limiting ---
router.use(apiLimiter);

// --- Public Endpoints (Read-only) ---
router.get('/issuers', issuersController.getAllIssuers);
router.get('/issuer/:id', issuersController.getIssuerById);
router.get('/issuer-documents', issuersController.getIssuerDocuments);
router.get('/ai/news', aiController.getMarketNews);
router.get('/metrics/:issuerId', metricsController.getMetrics);
router.get('/metrics/history/:issuerId', metricsController.getIssuerHistory);
router.get('/bcn', metricsController.getBcnRates);
router.get('/status', systemController.getSystemStatus);
router.post('/metrics/compare', metricsController.compareMetrics);

// --- Optional Auth Endpoints (Hybrid: Guest or User) ---
// AI Queries (Guests + Authenticated)
router.post('/ai/query', optionalAuthMiddleware, aiController.queryAI);
router.post('/ai/compare', optionalAuthMiddleware, aiController.compareAI);
router.get('/ai/insights/:issuerId', optionalAuthMiddleware, aiController.getInsights);

// --- Protected Endpoints (Requires Strict Auth) ---
router.use(authMiddleware);

// Issuers Write (Admin Only)
router.post('/seed', adminMiddleware, issuersController.seedIssuers);
router.post('/add-document/:issuerId', adminMiddleware, issuersController.addDocumentManual);

// (Moved above)

// Metrics Extraction & Management (Admin Only)
router.post('/metrics/extract/:issuerId', adminMiddleware, metricsController.extractMetrics);
router.post('/metrics/history/extract/:issuerId', adminMiddleware, metricsController.extractHistory);
router.post('/process/:issuerId', adminMiddleware, systemController.triggerProcessing);
router.post('/scrape', adminMiddleware, systemController.triggerScrape);
router.post('/fix-urls', adminMiddleware, systemController.fixStorageUrls);

// Debug Endpoints (Admin Only)
router.use('/debug', adminMiddleware);
router.get('/debug/vertex', aiController.debugVertex);
router.get('/debug/sync-config', aiController.syncConfig);
router.get('/debug/view-text/:issuerId', metricsController.debugViewChunkText);
router.get('/debug/recent-chunks/:issuerId', metricsController.debugViewRecentChunks);

module.exports = router;
