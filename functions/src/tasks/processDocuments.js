const { getFirestore } = require('firebase-admin/firestore');
const { processIssuerDocuments } = require('../services/documentProcessor');
const { extractIssuerMetrics, extractHistoricalMetrics } = require('../services/metricsExtractor');
const functions = require('firebase-functions');

/**
 * Tarea para procesar documentos de todos los emisores
 * Se ejecuta manualmente o por Cloud Scheduler
 */
async function processAllDocuments() {
    const db = getFirestore();

    try {
        functions.logger.info('Starting document processing task...');

        // Get all active issuers
        const issuersSnapshot = await db
            .collection('issuers')
            .where('active', '==', true)
            .get();

        if (issuersSnapshot.empty) {
            functions.logger.info('No active issuers found to process');
            return;
        }

        functions.logger.info(`Found ${issuersSnapshot.size} active issuers to process`);

        let totalProcessed = 0;
        let totalErrors = 0;

        // Process each issuer sequentially to avoid overwhelming the API
        for (const issuerDoc of issuersSnapshot.docs) {
            const issuer = issuerDoc.data();

            try {
                functions.logger.info(`Processing documents for ${issuer.name}...`);

                const { processedCount, errorCount } = await processIssuerDocuments(
                    issuerDoc.id,
                    issuer.name,
                    issuer.documents || []
                );

                totalProcessed += processedCount;
                totalErrors += errorCount;

                // Update issuer with processing metadata
                await issuerDoc.ref.update({
                    lastProcessed: new Date(),
                    documentsProcessed: processedCount,
                });

                // NEW: Automatically trigger metrics extraction for the dashboard
                if (processedCount > 0) {
                    functions.logger.info(`Triggering metrics extraction for ${issuer.name}...`);
                    await extractIssuerMetrics(issuerDoc.id, issuer.name).catch(e => functions.logger.error('Metrics extraction failed:', e));
                    await extractHistoricalMetrics(issuerDoc.id, issuer.name).catch(e => functions.logger.error('Historical extraction failed:', e));
                }

                // Delay between issuers to respect rate limits
                await new Promise(resolve => setTimeout(resolve, 5000));

            } catch (error) {
                functions.logger.error(`Error processing ${issuer.name}:`, error);
                totalErrors++;
            }
        }

        functions.logger.info(
            `Document processing complete. Processed: ${totalProcessed}, Errors: ${totalErrors}`
        );

        return { totalProcessed, totalErrors };

    } catch (error) {
        functions.logger.error('Fatal error in document processing:', error);
        throw error;
    }
}

/**
 * Process documents for specific issuers
 * @param {string[]} issuerIds Array of issuer IDs to process
 */
async function processIssuers(issuerIds) {
    const db = getFirestore();
    let totalProcessed = 0;
    let totalErrors = 0;

    for (const issuerId of issuerIds) {
        try {
            const doc = await db.collection('issuers').doc(issuerId).get();
            if (!doc.exists) continue;

            const issuer = doc.data();
            functions.logger.info(`Processing documents for ${issuer.name}...`);

            const { processedCount, errorCount } = await processIssuerDocuments(
                issuerId,
                issuer.name,
                issuer.documents || []
            );

            totalProcessed += processedCount;
            totalErrors += errorCount;

            await doc.ref.update({
                lastProcessed: new Date(),
                documentsProcessed: processedCount,
            });

            // NEW: Automatically trigger metrics extraction for the dashboard
            if (processedCount > 0) {
                functions.logger.info(`Triggering metrics extraction for ${issuer.name}...`);
                await extractIssuerMetrics(issuerId, issuer.name).catch(e => functions.logger.error('Metrics extraction failed:', e));
                await extractHistoricalMetrics(issuerId, issuer.name).catch(e => functions.logger.error('Historical extraction failed:', e));
            }

        } catch (error) {
            functions.logger.error(`Error processing ${issuerId}:`, error);
            totalErrors++;
        }
    }
    return { totalProcessed, totalErrors };
}

module.exports = {
    processAllDocuments,
    processIssuers
};
