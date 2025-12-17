const express = require('express');
const router = express.Router();

const issuersController = require('../controllers/issuersController');
const aiController = require('../controllers/aiController');
const metricsController = require('../controllers/metricsController');
const systemController = require('../controllers/systemController');

// --- Issuers Endpoints ---
router.get('/issuers', issuersController.getAllIssuers);
router.get('/issuer/:id', issuersController.getIssuerById);
router.get('/issuer-documents', issuersController.getIssuerDocuments);
router.post('/seed', issuersController.seedIssuers);
router.post('/add-document/:issuerId', issuersController.addDocumentManual);

// --- AI Endpoints ---
router.post('/ai/query', aiController.queryAI);
router.post('/ai/compare', aiController.compareAI);
router.get('/ai/insights/:issuerId', aiController.getInsights);
router.get('/ai/news', aiController.getMarketNews);
router.get('/debug/vertex', aiController.debugVertex);

// --- Metrics Endpoints ---
router.get('/bcn', metricsController.getBcnRates);
router.post('/metrics/compare', metricsController.compareMetrics);
router.post('/metrics/extract/:issuerId', metricsController.extractMetrics);
router.get('/metrics/:issuerId', metricsController.getMetrics);
router.get('/metrics/history/:issuerId', metricsController.getIssuerHistory);
router.post('/metrics/history/extract/:issuerId', metricsController.extractHistory);

// --- System Endpoints ---
router.get('/status', systemController.getSystemStatus);
router.post('/process/:issuerId', systemController.triggerProcessing);
router.post('/scrape', systemController.triggerScrape);

module.exports = router;
