const { extractIssuerMetrics } = require('./metrics/extractionService');
const { extractHistoricalMetrics, getIssuerHistory } = require('./metrics/historyService');
const { getFirestore } = require('firebase-admin/firestore');
const { loadRemoteConfig } = require("../utils/issuerConfig");

/**
 * Extract metrics for all active issuers
 */
async function extractAllMetrics() {
    const db = getFirestore();
    const issuersSnapshot = await db.collection('issuers')
        .where('isActive', '==', true)
        .get();

    const results = [];

    for (const issuerDoc of issuersSnapshot.docs) {
        const issuerData = issuerDoc.data();

        if (issuerData.documentsProcessed > 0) {
            try {
                const metrics = await extractIssuerMetrics(issuerDoc.id, issuerData.name);
                results.push({
                    issuerId: issuerDoc.id,
                    issuerName: issuerData.name,
                    success: true,
                    metrics,
                });
            } catch (error) {
                results.push({
                    issuerId: issuerDoc.id,
                    issuerName: issuerData.name,
                    success: false,
                    error: error.message,
                });
            }
            // Rate limit internal loop
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }

    return results;
}

/**
 * Get cached metrics for an issuer
 */
async function getIssuerMetrics(issuerId) {
    const db = getFirestore();
    const config = await loadRemoteConfig();

    let metricsDoc = await db.collection('issuerMetrics').doc(issuerId).get();

    if (!metricsDoc.exists && config.EXTRACTION_MAPPING && config.EXTRACTION_MAPPING[issuerId]) {
        for (const candidate of config.EXTRACTION_MAPPING[issuerId]) {
            const snap = await db.collection('issuerMetrics').doc(candidate).get();
            if (snap.exists) {
                metricsDoc = snap;
                break;
            }
        }
    }

    if (!metricsDoc.exists) {
        return null;
    }

    return metricsDoc.data();
}

/**
 * Compare metrics across multiple issuers
 */
async function compareIssuerMetrics(issuerIds) {
    const comparisons = [];
    for (const issuerId of issuerIds) {
        const metrics = await getIssuerMetrics(issuerId);
        if (metrics) {
            comparisons.push(metrics);
        }
    }
    return comparisons;
}

module.exports = {
    extractIssuerMetrics,
    extractAllMetrics,
    getIssuerMetrics,
    getIssuerHistory,
    compareIssuerMetrics,
    extractHistoricalMetrics
};
