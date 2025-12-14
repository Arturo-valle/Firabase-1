const functions = require("firebase-functions");
const { getFirestore } = require("firebase-admin/firestore");
const { compareIssuerMetrics, extractIssuerMetrics, getIssuerMetrics, getIssuerHistory } = require('../services/metricsExtractor');
const { scrapeBcnRates } = require("../scrapers/getBcnRates");

const db = getFirestore();

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
        functions.logger.info(`API request for history of ID: ${issuerId}`);
        const history = await getIssuerHistory(issuerId);
        res.json(history);
    } catch (error) {
        functions.logger.error("Error getting issuer history:", error);
        res.status(500).json({ error: error.message });
    }
};

exports.compareMetrics = async (req, res) => {
    try {
        const { issuerIds } = req.body;
        if (!issuerIds || !Array.isArray(issuerIds)) {
            return res.status(400).json({ error: "issuerIds array is required" });
        }

        const comparison = await compareIssuerMetrics(issuerIds);
        res.json(comparison);
    } catch (error) {
        functions.logger.error("Error comparing metrics:", error);
        res.status(500).json({ error: error.message });
    }
};

exports.extractMetrics = async (req, res) => {
    const { issuerId } = req.params;
    try {
        const issuerDoc = await db.collection("issuers").doc(issuerId).get();
        if (!issuerDoc.exists) return res.status(404).json({ error: "Issuer not found" });

        const issuerName = issuerDoc.data().name;
        const metrics = await extractIssuerMetrics(issuerId, issuerName);
        res.json({ success: true, metrics });
    } catch (error) {
        functions.logger.error(`Error extracting metrics for ${issuerId}:`, error);
        res.status(500).json({ error: error.message });
    }
};

exports.getMetrics = async (req, res) => {
    const { issuerId } = req.params;
    try {
        const metrics = await getIssuerMetrics(issuerId);
        if (!metrics) {
            return res.status(404).json({ error: "Metrics not found" });
        }
        res.json({ success: true, metrics });
    } catch (error) {
        functions.logger.error(`Error fetching metrics for ${issuerId}:`, error);
        res.status(500).json({ error: "Failed to fetch metrics" });
    }
};
