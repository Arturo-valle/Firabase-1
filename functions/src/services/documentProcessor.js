const axios = require('axios');
const pdfParse = require('pdf-parse');
const { getFirestore } = require('firebase-admin/firestore');
const { generateEmbeddings } = require('./vertexAI');
const functions = require('firebase-functions');

/**
 * Descarga un PDF desde una URL
 * @param {string} url - URL del PDF
 * @returns {Promise<Buffer>} Buffer del PDF
 */
async function downloadPDF(url) {
    try {
        // Handle relative URLs and encode URI components
        let fullUrl = url.startsWith('http') ? url : `https://www.bolsanic.com${url}`;

        // Encode spaces and special characters if they aren't already encoded
        // This is a simple check - if it has spaces, it needs encoding
        if (fullUrl.includes(' ')) {
            fullUrl = encodeURI(fullUrl);
        }

        functions.logger.info(`Downloading PDF from: ${fullUrl}`);

        const response = await axios.get(fullUrl, {
            responseType: 'arraybuffer',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
            timeout: 30000, // 30 seconds
        });

        return Buffer.from(response.data);
    } catch (error) {
        functions.logger.error(`Error downloading PDF from ${url}:`, error.message);
        if (error.response) {
            functions.logger.error(`Response status: ${error.response.status}`);
        }
        throw new Error(`Failed to download PDF: ${error.message}`);
    }
}

/**
 * Extrae texto de un PDF buffer
 * @param {Buffer} pdfBuffer 
 * @returns {Promise<string>} Texto extraído
 */
async function extractTextFromPDF(pdfBuffer) {
    try {
        const data = await pdfParse(pdfBuffer);
        return data.text;
    } catch (error) {
        functions.logger.error('Error extracting text from PDF:', error.message);
        throw new Error(`Failed to extract text: ${error.message}`);
    }
}


/**
 * Divide texto en chunks para embeddings
 * @param {string} text 
 * @param {number} maxChunkSize - Tamaño máximo del chunk en caracteres
 * @param {number} overlap - Solapamiento entre chunks
 * @returns {string[]} Array de chunks
 */
function chunkText(text, maxChunkSize = 1500, overlap = 200) {
    const chunks = [];
    let start = 0;

    while (start < text.length) {
        let end = start + maxChunkSize;

        // Try to break at a period or newline
        if (end < text.length) {
            const breakPoint = text.lastIndexOf('.', end);
            if (breakPoint > start + maxChunkSize / 2) {
                end = breakPoint + 1;
            }
        }

        chunks.push(text.substring(start, end).trim());
        start = Math.max(start + 1, end - overlap);
    }

    return chunks.filter(chunk => chunk.length > 10); // Filter out tiny chunks
}

/**
 * Procesa un documento completo: descarga, extracción, chunking, embeddings
 * @param {object} document - Objeto documento con url, title, date, type
 * @param {string} issuerName - Nombre del emisor
 * @returns {Promise<object[]>} Array de chunks procesados con embeddings
 */
async function processDocument(document, issuerName, issuerId) {
    try {
        functions.logger.info(`Processing document: ${document.title} for ${issuerName}`);

        // 1. Download PDF
        const pdfBuffer = await downloadPDF(document.url);

        // 2. Extract text
        const text = await extractTextFromPDF(pdfBuffer);

        if (!text || text.length < 10) {
            functions.logger.warn(`Document ${document.title} has insufficient text content`);
            return [];
        }

        // --- INTELLIGENT INGESTION START ---
        // New Step: Try to extract structured financial data with LLM
        let structuredData = null;
        let superChunk = null;

        // Simple heuristic to identify financial statements
        const isFinancialStatement = (document.type || '').match(/financiero|auditado|balance/i) ||
            (document.title || '').match(/estados?\s*financieros?|auditados?|balance/i);

        if (isFinancialStatement) {
            try {
                functions.logger.info(`Generative AI Extraction: Analyzing financial document ${document.title}...`);
                const { generateFinancialAnalysis } = require('./vertexAI');

                // Limit text context for LLM (first 30k chars usually contain the statements)
                const textContext = text.slice(0, 30000);

                const extractionPrompt = `Eres un auditor financiero experto procesando documentos de ${issuerName}.
Tu objetivo es limpiar y estructurar los datos financieros Clave del siguiente texto crudo extraído de un PDF.

TEXTO CRUDO (Inicio del documento):
${textContext}

TAREA 1: Identifica el año fiscal principal y el periodo (Anual, Trimestral).
TAREA 2: Extrae las METRICAS CLAVE EXACTAS (sin redondeo) en formato JSON.
TAREA 3: Genera una TABLA MARKDOWN limpia y legible del Estado de Resultados (o Actividad) y Balance General, corrigiendo errores de OCR.

RESPUESTA REQUERIDA (JSON PURO):
{
  "is_financial_doc": true,
  "fiscal_year": 2023,
  "period": "Annual",
  "metrics": {
    "net_income": 123456.78, (Usa 0 si no encuentras)
    "total_assets": 123456.78,
    "total_equity": 123456.78,
    "total_revenue": 123456.78
  },
  "markdown_summary": "## Resumen Financiero Estructurado\n\n### Estado de Resultados\n| Concepto | Monto |\n|...|...|\n"
}
Solo devuelve el JSON válido, sin texto adicional markdown (\`\`\`).`;

                const llmResponse = await generateFinancialAnalysis(extractionPrompt, {
                    temperature: 0.1, // High precision
                    maxTokens: 4096, // More output space for tables
                    model: 'gemini-2.5-flash-lite' // Use proven model
                });

                // Clean json block if present
                const jsonStr = llmResponse.replace(/```json/g, '').replace(/```/g, '').trim();
                structuredData = JSON.parse(jsonStr);

                if (structuredData && structuredData.is_financial_doc) {
                    functions.logger.info(`Smart Ingestion: Extracted metrics for ${structuredData.fiscal_year}`);

                    // A) Store in dedicated metrics collection (Recommendation 2)
                    if (structuredData.metrics && structuredData.fiscal_year) {
                        const db = getFirestore();
                        await db.collection('financialMetrics').doc(`${issuerId}_${structuredData.fiscal_year}`).set({
                            issuerId,
                            issuerName,
                            year: structuredData.fiscal_year,
                            period: structuredData.period,
                            metrics: structuredData.metrics,
                            sourceDocument: document.title,
                            updatedAt: new Date()
                        }, { merge: true });
                    }

                    // B) Create a "Super Chunk" (Recommendation 1)
                    if (structuredData.markdown_summary) {
                        const embeddings = await generateEmbeddings(structuredData.markdown_summary);
                        superChunk = {
                            chunkIndex: -1, // Special index
                            text: "RESUMEN FINANCIERO ESTRUCTURADO Y VERIFICADO:\n" + structuredData.markdown_summary,
                            embedding: embeddings,
                            metadata: {
                                issuerName: issuerName,
                                documentTitle: document.title,
                                documentUrl: document.url,
                                documentDate: document.date,
                                documentType: "Smart Extract", // Special type
                                processedAt: new Date().toISOString(),
                                isSuperChunk: true
                            }
                        };
                    }
                }

            } catch (err) {
                functions.logger.warn(`Smart Ingestion Failed for ${document.title}:`, err.message);
                // Non-blocking failure, continue with standard chunking
            }
        }
        // --- INTELLIGENT INGESTION END ---

        // 3. Chunk text (Standard Process)
        const chunks = chunkText(text);
        functions.logger.info(`Created ${chunks.length} standard chunks for ${document.title}`);

        // 4. Generate embeddings for each chunk
        const processedChunks = [];

        // Add Super Chunk if available
        if (superChunk) {
            processedChunks.push(superChunk);
            functions.logger.info('Added Super Chunk to processed list');
        }

        for (let i = 0; i < chunks.length; i++) {
            try {
                const embedding = await generateEmbeddings(chunks[i]);

                processedChunks.push({
                    chunkIndex: i,
                    text: chunks[i],
                    embedding: embedding,
                    metadata: {
                        issuerName: issuerName,
                        documentTitle: document.title,
                        documentUrl: document.url,
                        documentDate: document.date,
                        documentType: document.type,
                        processedAt: new Date().toISOString(),
                    },
                });
            } catch (error) {
                functions.logger.error(`Error processing chunk ${i} of ${document.title}:`, error.message);
                // Continue with next chunk
            }
        }

        return {
            chunks: processedChunks,
            smartStatus: isFinancialStatement ? (superChunk ? 'success' : 'failed_generation') : 'skipped_regex'
        };
    } catch (error) {
        functions.logger.error(`Error processing document ${document.title}:`, error.message);
        return { chunks: [], smartStatus: `error: ${error.message}` };
    }
}

/**
 * Almacena chunks procesados en Firestore en lotes para evitar límites de transacción
 * @param {string} issuerId - ID del emisor
 * @param {string} documentId - ID único del documento
 * @param {object[]} chunks - Chunks procesados con embeddings
 */
async function storeDocumentChunks(issuerId, documentId, chunks) {
    const db = getFirestore();
    const BATCH_SIZE = 100; // Firestore allows 500, but we use 100 to be safe with data size

    let totalStored = 0;

    // Process in batches of 100
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batchChunks = chunks.slice(i, i + BATCH_SIZE);
        const batch = db.batch();

        batchChunks.forEach((chunk, batchIndex) => {
            const globalIndex = i + batchIndex;
            const docRef = db
                .collection('documentChunks')
                .doc(`${issuerId}_${documentId}_chunk_${globalIndex}`);

            batch.set(docRef, {
                issuerId,
                documentId,
                chunkIndex: chunk.chunkIndex,
                text: chunk.text,
                embedding: chunk.embedding,
                metadata: chunk.metadata,
                createdAt: new Date(),
            });
        });

        await batch.commit();
        totalStored += batchChunks.length;
        functions.logger.info(`Stored batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batchChunks.length} chunks (${totalStored}/${chunks.length} total)`);

        // Short delay between batches to avoid overwhelming Firestore
        if (i + BATCH_SIZE < chunks.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    functions.logger.info(`Successfully stored all ${chunks.length} chunks for document ${documentId}`);
}

/**
 * Process all documents for an issuer and generate embeddings
 * @param {string} issuerId - Issuer ID
 * @param {string} issuerName - Issuer name
 * @param {Array} documents - Array of document objects
 * @param {number} maxDocuments - Maximum number of documents to process (default: 10, use Infinity for all)
 * @returns {Object} - Processing statistics
 */
async function processIssuerDocuments(issuerId, issuerName, documents, maxDocuments = 10) {
    functions.logger.info(`Processing ${documents.length} documents for ${issuerName} (max: ${maxDocuments})`);

    let processedCount = 0;
    let errorCount = 0;

    // Log available types for debugging
    const availableTypes = [...new Set(documents.map(d => d.type))];
    functions.logger.info(`Available document types for ${issuerName}: ${availableTypes.join(', ')}`);

    // Process financial statements, risk ratings, and relevant facts
    // Enhanced document filtering with priority scoring
    const scoredDocs = documents.map(doc => {
        const type = (doc.type || '').toLowerCase();
        const title = (doc.title || '').toLowerCase();
        const combined = `${type} ${title}`;

        let score = 0;

        // Highest priority: Audited Financial Statements
        if (combined.includes('auditado') && combined.includes('financiero')) {
            score += 100;
        } else if (combined.includes('financiero') && (combined.includes('estado') || combined.includes('eeff'))) {
            score += 80;
        }

        // High priority: Annual reports and comprehensive financial docs
        if (combined.includes('memoria anual') || combined.includes('informe anual')) {
            score += 70;
        }

        // Medium priority: Risk ratings and financial analysis
        if (combined.includes('calificaci') && combined.includes('riesgo')) {
            score += 50;
        }

        // Lower priority: Other relevant documents
        if (combined.includes('relevante') || combined.includes('hecho relevante')) {
            score += 30;
        }

        // General financial keywords
        if (combined.includes('financiero')) score += 20;
        if (combined.includes('informe')) score += 10;

        return { ...doc, priorityScore: score };
    });

    // Filter out documents with score 0 (irrelevant)
    const relevantDocs = scoredDocs.filter(doc => doc.priorityScore > 0);

    functions.logger.info(`Filtered ${relevantDocs.length} relevant documents from ${documents.length} total (score > 0)`);

    // Helper to parse date string
    const parseDate = (dateStr) => {
        if (!dateStr) return new Date(0);
        // Handle ISO string
        if (dateStr.includes('-') && dateStr.includes('T')) {
            return new Date(dateStr);
        }
        try {
            // Extract date part dd/mm/yyyy
            const [datePart] = dateStr.split(' ');
            if (datePart.includes('/')) {
                const [day, month, year] = datePart.split('/');
                return new Date(`${year}-${month}-${day}`);
            }
            return new Date(dateStr);
        } catch (e) {
            return new Date(0);
        }
    };

    // Sort by priority score first, then by date (newest first)
    relevantDocs.sort((a, b) => {
        // First compare by priority score (higher is better)
        if (b.priorityScore !== a.priorityScore) {
            return b.priorityScore - a.priorityScore;
        }
        // If same score, sort by date (newer is better)
        return parseDate(b.date) - parseDate(a.date);
    });

    const docsToProcess = Math.min(maxDocuments, relevantDocs.length);
    functions.logger.info(`Processing top ${docsToProcess} documents from ${relevantDocs.length} available`);

    const debugInfo = [];

    for (const doc of relevantDocs.slice(0, docsToProcess)) {
        try {
            // Use the shared, enhanced processDocument function (now with Smart Ingestion)
            functions.logger.info(`Starting smart processing for: ${doc.title}`);
            const result = await processDocument(doc, issuerName, issuerId);

            // Handle new object return signature
            const chunks = result.chunks || [];
            const smartStatus = result.smartStatus || 'unknown';

            // Calculate pseudo text length for debug info
            const textLength = chunks.reduce((acc, c) => acc + (c.text ? c.text.length : 0), 0);
            debugInfo.push({ title: doc.title, textLength, chunksCount: chunks.length, smartStatus });

            if (chunks.length > 0) {
                // Generate safe document ID
                const documentId = doc.title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
                await storeDocumentChunks(issuerId, documentId, chunks);
                processedCount++;
            }
        } catch (error) {
            functions.logger.error(`Error processing document ${doc.title}:`, error);
            errorCount++;
            debugInfo.push({ title: doc.title, error: error.message });
        }
    }

    functions.logger.info(`Processed ${processedCount} documents with ${errorCount} errors for ${issuerName}`);
    return { processedCount, errorCount, relevantDocsCount: relevantDocs.length, totalDocs: documents.length, debugInfo };
}

module.exports = {
    downloadPDF,
    extractTextFromPDF,
    chunkText,
    processDocument,
    storeDocumentChunks,
    processIssuerDocuments,
};
