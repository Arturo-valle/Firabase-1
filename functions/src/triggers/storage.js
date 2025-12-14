const { onObjectFinalized } = require("firebase-functions/v2/storage");
const admin = require("firebase-admin");
const { getFirestore } = require("firebase-admin/firestore");
const { processDocument } = require("../services/documentProcessor");
const { extractIssuerMetrics } = require("../services/metricsExtractor");
const logger = require("firebase-functions/logger");

const db = getFirestore();

/**
 * Trigger that runs when a new object is finalized in Cloud Storage.
 * It checks if the file is in the 'documents/{issuerId}/' path and processes it.
 */
exports.onDocumentUpload = onObjectFinalized({
    region: "us-central1",
    timeoutSeconds: 300,
    memory: "1GB",
}, async (event) => {
    const object = event.data; // V2: object metadata is in event.data
    const filePath = object.name; // e.g., documents/agricorp/report.pdf
    const contentType = object.contentType; // e.g., application/pdf

    // 1. Validate File Path and Type
    if (!filePath.startsWith("documents/") || !contentType.includes("pdf")) {
        logger.info(`Skipping file: ${filePath} (${contentType})`);
        return;
    }

    const parts = filePath.split("/");
    if (parts.length < 3) {
        logger.info(`Skipping file with invalid path structure: ${filePath}`);
        return;
    }

    const issuerId = parts[1];
    const fileName = parts[parts.length - 1];

    logger.info(`New document detected for issuer: ${issuerId}, file: ${fileName}`);

    try {
        // 2. Get Issuer Name
        const issuerDoc = await db.collection("issuers").doc(issuerId).get();
        if (!issuerDoc.exists) {
            logger.warn(`Issuer not found for ID: ${issuerId}. Skipping processing.`);
            return;
        }

        const issuerName = issuerDoc.data().name;

        // 3. Construct Document Object
        // We assume the file is public or accessible via signed URL.
        const bucketName = object.bucket;
        const publicUrl = `https://storage.googleapis.com/${bucketName}/${filePath}`;

        const document = {
            url: publicUrl,
            title: fileName.replace(/_/g, ' ').replace('.pdf', ''),
            date: object.timeCreated || new Date().toISOString(),
            type: 'Auto-Detected',
        };

        // 4. Process Document
        logger.info(`Starting automatic processing for ${fileName}...`);
        await processDocument(document, issuerName);
        logger.info(`Successfully processed ${fileName}`);

        // 5. Trigger AI Metrics Update
        logger.info(`Triggering AI Metrics Recalculation for ${issuerName}...`);
        await extractIssuerMetrics(issuerId, issuerName);

    } catch (error) {
        logger.error(`Error processing uploaded file ${filePath}:`, error);
    }
});
