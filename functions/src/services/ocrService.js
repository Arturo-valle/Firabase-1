/**
 * OCR Service using Google Cloud Vision API
 * Extracts text from scanned PDF documents that pdf-parse cannot read
 */

const { Storage } = require('@google-cloud/storage');
const { ImageAnnotatorClient } = require('@google-cloud/vision');
const { generateFinancialAnalysis, AI_CONFIG } = require('./vertexAI');
const functions = require('firebase-functions');
const path = require('path');
const crypto = require('crypto');

// Initialize clients
const storage = new Storage();
const visionClient = new ImageAnnotatorClient();

const BUCKET_NAME = 'mvp-nic-market.firebasestorage.app';
const OCR_TEMP_FOLDER = 'ocr-temp';

/**
 * Extract text from a PDF buffer using Cloud Vision OCR
 * Uses async batch annotation for full PDF support
 * @param {Buffer} pdfBuffer - The PDF file as a buffer
 * @param {string} documentTitle - Title for logging and temp file naming
 * @returns {Promise<string>} - Extracted text from the PDF
 */
async function extractTextWithOCR(pdfBuffer, documentTitle = 'document', gcsUri = null) {
    const startTime = Date.now();

    try {
        let inputUri = gcsUri;
        let tempFile = null;

        // 1. If no GS URI provided, upload to temp
        if (!inputUri) {
            functions.logger.info(`[OCR] No GCS URI provided, uploading buffer to temp...`);
            const hash = crypto.createHash('md5').update(pdfBuffer).digest('hex').substring(0, 8);
            const safeName = documentTitle.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
            const tempFileName = `${OCR_TEMP_FOLDER}/${safeName}_${hash}.pdf`;

            const bucket = storage.bucket(BUCKET_NAME);
            tempFile = bucket.file(tempFileName);
            await tempFile.save(pdfBuffer, { contentType: 'application/pdf' });
            inputUri = `gs://${BUCKET_NAME}/${tempFileName}`;
        }

        const hash = crypto.createHash('md5').update(inputUri).digest('hex').substring(0, 8);
        const outputPrefix = `${OCR_TEMP_FOLDER}/output_${hash}`;

        functions.logger.info(`[OCR] Starting OCR for: ${documentTitle} via ${inputUri}`);

        // 2. Configure Vision API async request
        const inputConfig = {
            mimeType: 'application/pdf',
            gcsSource: { uri: inputUri }
        };

        const outputConfig = {
            gcsDestination: { uri: `gs://${BUCKET_NAME}/${outputPrefix}/` },
            batchSize: 100
        };

        const request = {
            requests: [{
                inputConfig,
                features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
                outputConfig
            }]
        };

        // 3. Execute
        functions.logger.info(`[OCR] Starting Vision API async batch annotation...`);
        const [operation] = await visionClient.asyncBatchAnnotateFiles(request);
        await operation.promise();

        // 4. Read results
        const bucket = storage.bucket(BUCKET_NAME);
        const [outputFiles] = await bucket.getFiles({ prefix: `${outputPrefix}/` });

        let fullText = '';
        for (const outputFile of outputFiles) {
            if (outputFile.name.endsWith('.json')) {
                const [content] = await outputFile.download();
                const result = JSON.parse(content.toString());
                if (result.responses) {
                    for (const response of result.responses) {
                        if (response.fullTextAnnotation && response.fullTextAnnotation.text) {
                            fullText += response.fullTextAnnotation.text + '\n\n';
                        }
                    }
                }
            }
        }

        // 5. Cleanup
        try {
            if (tempFile) await tempFile.delete();
            for (const file of outputFiles) await file.delete();
        } catch (e) { functions.logger.warn(`[OCR] Cleanup error: ${e.message}`); }

        functions.logger.info(`[OCR] SUCCESS: Extracted ${fullText.length} chars for ${documentTitle}`);
        return fullText.trim();

    } catch (error) {
        functions.logger.error(`[OCR] Vision API FAILED for ${documentTitle}, attempting Gemini OCR GCS:`, error.message);
        return await geminiOCR(pdfBuffer, documentTitle, gcsUri);
    }
}

/**
 * Uses Gemini 3 Flash to perform OCR on a PDF buffer
 */
async function geminiOCR(pdfBuffer, documentTitle, gcsUri = null) {
    functions.logger.info(`[GEMINI OCR SDK] Starting extraction for: ${documentTitle} (GCS: ${!!gcsUri})`);

    // Switch to Vertex SDK pattern
    const { GoogleGenAI } = require('@google/genai');
    const client = new GoogleGenAI({
        vertexai: true,
        project: 'mvp-nic-market',
        location: 'global'
    });

    try {
        const parts = [
            { text: "Eres un sistema OCR de alta precisión. Extrae todo el texto de este documento PDF de forma íntegra. Mantén la estructura y tablas." }
        ];

        if (gcsUri) {
            parts.push({
                fileData: {
                    mimeType: 'application/pdf',
                    fileUri: gcsUri
                }
            });
        } else {
            parts.push({
                inlineData: {
                    mimeType: 'application/pdf',
                    data: pdfBuffer.toString('base64')
                }
            });
        }

        const response = await client.models.generateContent({
            model: 'gemini-2.0-flash-exp',
            contents: [{
                role: 'user',
                parts: parts
            }]
        });

        if (!response || !response.text) {
            throw new Error("No text returned from Gemini SDK");
        }

        const text = response.text;
        functions.logger.info(`[GEMINI OCR SDK] SUCCESS: Extracted ${text.length} chars for ${documentTitle}`);
        return text;

    } catch (e) {
        functions.logger.error(`[GEMINI OCR SDK] FAILED for ${documentTitle}:`, e.message);
        throw e;
    }
}

/**
 * Quick check if a PDF appears to be scanned (image-based)
 * Uses heuristics on the text content
 * @param {string} text - Text extracted by pdf-parse
 * @returns {boolean} - True if document appears to be scanned
 */
function appearsScanned(text) {
    if (!text || text.length < 50) return true;

    // If text is mostly garbage characters, likely OCR failed
    const alphanumericRatio = (text.match(/[a-zA-Z0-9áéíóúñÁÉÍÓÚÑ]/g) || []).length / text.length;

    // Less than 60% alphanumeric suggests garbage
    return alphanumericRatio < 0.6;
}

module.exports = {
    extractTextWithOCR,
    appearsScanned
};
