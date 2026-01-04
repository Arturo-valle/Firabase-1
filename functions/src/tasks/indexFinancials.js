const { getFirestore } = require("firebase-admin/firestore");
const admin = require("firebase-admin");
const { scrapeBolsanicDocuments } = require("../scrapers/getBolsanicDocuments");
const { processDocument, storeDocumentChunks } = require("../services/documentProcessor");
const { extractIssuerMetrics } = require("../services/metricsExtractor");
const functions = require("firebase-functions");

const db = getFirestore();

/**
 * Task to specifically index "Financial" documents (Statements, Annual Reports)
 * which are critical for the Dashboard and Analysis modules.
 * This skips general news/facts to save resources.
 */
const indexFinancials = async (reqOrContext, resOrNull) => {
    try {
        // Check if triggered by HTTP with a query param or body
        const issuerIdParam = (reqOrContext?.query?.issuerId) || (reqOrContext?.body?.issuerId);

        if (issuerIdParam) {
            query = db.collection("issuers").where(admin.firestore.FieldPath.documentId(), "==", issuerIdParam);
        } else {
            // Default scheduled behavior: only active issuers
            query = db.collection("issuers").where("active", "==", true);
        }

        const issuersSnapshot = await query.get();

        const results = [];

        // Process each issuer
        for (const doc of issuersSnapshot.docs) {
            const issuer = doc.data();
            const issuerId = doc.id;

            if (!issuer.detailUrl) continue;

            functions.logger.info(`Checking financials for ${issuer.name}...`);

            // 1. Scrape all available document links
            const allDocs = await scrapeBolsanicDocuments(issuer.detailUrl);

            // 2. Filter for HIGH VALUE financial documents
            const financialDocs = allDocs.filter(d => {
                const title = d.title.toLowerCase();
                // Match: "Estado Financiero", "Memoria Anual", "Informe Trimestral", "Balance", "Auditados", "Prospectos"
                return /financiero|balance|trimestral|memoria|anual|auditado|prospecto|calificacion|riesgo|ef\s/i.test(title);
            });

            functions.logger.info(`Found ${financialDocs.length} financial docs for ${issuer.name}`);

            let processedCount = 0;

            // 3. Process them (Download + OCR + Vectorize)
            for (const docMeta of financialDocs) {
                // Check if already processed to avoid re-work
                const existing = await db.collection("issuerDocuments")
                    .where("url", "==", docMeta.url)
                    .limit(1)
                    .get();

                if (existing.empty) {
                    functions.logger.info(`Processing NEW financial doc: ${docMeta.title}`);

                    // Add metadata tag for the AI to find it easily
                    docMeta.manuallyIndexed = true;
                    docMeta.docType = "FINANCIAL_REPORT";

                    try {
                        // Correctly call processDocument(document, issuerName, issuerId)
                        // processDocument returns { chunks: [...], smartStatus: '...' }
                        const { chunks } = await processDocument(docMeta, issuer.name, issuerId);
                        if (chunks && chunks.length > 0) {
                            const docId = docMeta.title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
                            await storeDocumentChunks(issuerId, docId, chunks);

                            // Mark as processed in issuerDocuments collection so we don't re-process
                            await db.collection("issuerDocuments").add({
                                ...docMeta,
                                issuerId,
                                processedAt: new Date(),
                                chunkCount: chunks.length
                            });

                            processedCount++;

                            // 4. Trigger AI Metrics Update immediately
                            functions.logger.info(`New document processed for ${issuer.name}. Triggering Metrics Recalculation...`);
                            await extractIssuerMetrics(issuerId, issuer.name);
                        }
                    } catch (err) {
                        functions.logger.error(`Failed to process ${docMeta.title}:`, err);
                    }
                }
            }

            results.push({
                issuer: issuer.name,
                found: financialDocs.length,
                processedNew: processedCount
            });
        }

        if (resOrNull) {
            resOrNull.json({
                success: true,
                processed: results.length,
                details: results
            });
        }
        return null; // For PubSub

    } catch (error) {
        functions.logger.error("Error in indexFinancials:", error);
        if (resOrNull) {
            resOrNull.status(500).json({ error: error.message });
        }
        throw error; // For PubSub retry
    }
};

module.exports = indexFinancials;
