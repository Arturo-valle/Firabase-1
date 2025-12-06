const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { getFirestore } = require("firebase-admin/firestore");
const { processDocument } = require("../services/documentProcessor");

const db = getFirestore();

/**
 * Trigger that runs when a new object is finalized in Cloud Storage.
 * It checks if the file is in the 'documents/{issuerId}/' path and processes it.
 */
exports.onDocumentUpload = functions
    .region('us-central1')
    .runWith({ timeoutSeconds: 300, memory: '1GB' })
    .storage.object()
    .onFinalize(async (object) => {
        const filePath = object.name; // e.g., documents/agricorp/report.pdf
        const contentType = object.contentType; // e.g., application/pdf

        // 1. Validate File Path and Type
        if (!filePath.startsWith("documents/") || !contentType.includes("pdf")) {
            functions.logger.info(`Skipping file: ${filePath} (${contentType})`);
            return;
        }

        const parts = filePath.split("/");
        if (parts.length < 3) {
            functions.logger.info(`Skipping file with invalid path structure: ${filePath}`);
            return;
        }

        const issuerId = parts[1];
        const fileName = parts[parts.length - 1];

        functions.logger.info(`New document detected for issuer: ${issuerId}, file: ${fileName}`);

        try {
            // 2. Get Issuer Name
            const issuerDoc = await db.collection("issuers").doc(issuerId).get();
            if (!issuerDoc.exists) {
                functions.logger.warn(`Issuer not found for ID: ${issuerId}. Skipping processing.`);
                return;
            }

            const issuerName = issuerDoc.data().name;

            // 3. Construct Document Object
            // We assume the file is public or accessible via signed URL.
            // Since scrapeAndStore makes it public, we try to construct the public URL.
            const bucketName = object.bucket;
            const publicUrl = `https://storage.googleapis.com/${bucketName}/${filePath}`;

            const document = {
                url: publicUrl,
                title: fileName.replace(/_/g, ' ').replace('.pdf', ''),
                date: object.timeCreated || new Date().toISOString(),
                type: 'Auto-Detected',
            };

            // 4. Process Document
            functions.logger.info(`Starting automatic processing for ${fileName}...`);
            await processDocument(document, issuerName);
            functions.logger.info(`Successfully processed ${fileName}`);

        } catch (error) {
            functions.logger.error(`Error processing uploaded file ${filePath}:`, error);
        }
    });
