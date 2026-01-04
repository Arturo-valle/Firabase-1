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
async function extractTextWithOCR(pdfBuffer, documentTitle = 'document') {
    const startTime = Date.now();

    try {
        // Generate unique filename for temp storage
        const hash = crypto.createHash('md5').update(pdfBuffer).digest('hex').substring(0, 8);
        const safeName = documentTitle.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
        const tempFileName = `${OCR_TEMP_FOLDER}/${safeName}_${hash}.pdf`;
        const outputPrefix = `${OCR_TEMP_FOLDER}/output_${hash}`;

        functions.logger.info(`[OCR] Starting OCR for: ${documentTitle}`);

        // 1. Upload PDF to GCS
        const bucket = storage.bucket(BUCKET_NAME);
        const file = bucket.file(tempFileName);

        await file.save(pdfBuffer, {
            contentType: 'application/pdf',
            metadata: {
                cacheControl: 'no-cache',
                source: 'ocr-temp-upload'
            }
        });

        functions.logger.info(`[OCR] Uploaded to gs://${BUCKET_NAME}/${tempFileName}`);

        // 2. Configure Vision API async request
        const inputConfig = {
            mimeType: 'application/pdf',
            gcsSource: {
                uri: `gs://${BUCKET_NAME}/${tempFileName}`
            }
        };

        const outputConfig = {
            gcsDestination: {
                uri: `gs://${BUCKET_NAME}/${outputPrefix}/`
            },
            batchSize: 100 // Process 100 pages per output file
        };

        const features = [{ type: 'DOCUMENT_TEXT_DETECTION' }];

        const request = {
            requests: [{
                inputConfig,
                features,
                outputConfig
            }]
        };

        // 3. Execute async batch annotation
        functions.logger.info(`[OCR] Starting Vision API async batch annotation...`);
        const [operation] = await visionClient.asyncBatchAnnotateFiles(request);

        // 4. Wait for operation to complete (with timeout)
        const [filesResponse] = await operation.promise();

        functions.logger.info(`[OCR] Vision API completed. Processing results...`);

        // 5. Read output JSON files from GCS
        const [outputFiles] = await bucket.getFiles({ prefix: `${outputPrefix}/` });

        let fullText = '';

        for (const outputFile of outputFiles) {
            if (outputFile.name.endsWith('.json')) {
                const [content] = await outputFile.download();
                const result = JSON.parse(content.toString());

                // Extract text from each page
                if (result.responses) {
                    for (const response of result.responses) {
                        if (response.fullTextAnnotation && response.fullTextAnnotation.text) {
                            fullText += response.fullTextAnnotation.text + '\n\n';
                        }
                    }
                }
            }
        }

        // 6. Cleanup temp files
        try {
            await file.delete();
            for (const outputFile of outputFiles) {
                await outputFile.delete();
            }
            functions.logger.info(`[OCR] Cleaned up temp files`);
        } catch (cleanupError) {
            functions.logger.warn(`[OCR] Cleanup warning: ${cleanupError.message}`);
        }

        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        functions.logger.info(`[OCR] SUCCESS: Extracted ${fullText.length} chars in ${duration}s for ${documentTitle}`);

        return fullText.trim();

    } catch (error) {
        functions.logger.error(`[OCR] Vision API FAILED for ${documentTitle}, attempting Gemini OCR:`, error.message);

        // FALLBACK TO GEMINI OCR
        try {
            return await geminiOCR(pdfBuffer, documentTitle);
        } catch (gemError) {
            functions.logger.error(`[OCR] Gemini OCR also FAILED:`, gemError.message);
            return '';
        }
    }
}

/**
 * Uses Gemini 3 Flash to perform OCR on a PDF buffer
 */
async function geminiOCR(pdfBuffer, documentTitle) {
    functions.logger.info(`[GEMINI OCR] Starting extraction for: ${documentTitle}`);

    // Note: Using standard SDK pattern consistent with vertexAI.js
    const { GoogleGenAI } = require('@google/genai');
    const client = new GoogleGenAI({
        vertexai: true,
        project: 'mvp-nic-market',
        location: 'global'
    });

    const prompt = `Eres un asistente experto en OCR. Tu tarea es extraer TODO el contenido de texto legible de este PDF financiero. 
Manten la estructura de tablas y el orden de los párrafos.
Si el documento está en español, extraelo en español.
SALIDA: Solo el texto extraído.`;

    try {
        const result = await client.models.generateContent({
            model: 'gemini-2.0-flash-exp',
            contents: [{
                role: 'user',
                parts: [
                    { text: prompt },
                    {
                        inlineData: {
                            mimeType: 'application/pdf',
                            data: pdfBuffer.toString('base64')
                        }
                    }
                ]
            }]
        });

        const text = result.text;

        if (!text) throw new Error("Empty text in Gemini response");

        functions.logger.info(`[GEMINI OCR] SUCCESS: Extracted ${text.length} chars for ${documentTitle}`);
        return text;

    } catch (e) {
        functions.logger.error(`[GEMINI OCR] Execution failed:`, e);
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
