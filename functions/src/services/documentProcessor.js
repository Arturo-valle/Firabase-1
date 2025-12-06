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
async function processDocument(document, issuerName) {
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

        // 3. Chunk text
        const chunks = chunkText(text);
        functions.logger.info(`Created ${chunks.length} chunks for ${document.title}`);

        // 4. Generate embeddings for each chunk
        const processedChunks = [];
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

                // Note: No artificial delay needed - REST API calls provide natural rate limiting
            } catch (error) {
                functions.logger.error(`Error processing chunk ${i} of ${document.title}:`, error.message);
                // Continue with next chunk
            }
        }

        return processedChunks;
    } catch (error) {
        functions.logger.error(`Error processing document ${document.title}:`, error.message);
        return [];
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

    for (const doc of relevantDocs.slice(0, docsToProcess)) { // Process up to maxDocuments
        try {
            // Inline processDocument logic to capture debug info
            functions.logger.info(`Processing document: ${doc.title} for ${issuerName}`);
            const pdfBuffer = await downloadPDF(doc.url);
            const text = await extractTextFromPDF(pdfBuffer);

            const textLength = text ? text.length : 0;
            const chunks = chunkText(text || '');

            debugInfo.push({ title: doc.title, textLength, chunksCount: chunks.length });

            if (chunks.length > 0) {
                // Generate embeddings and store
                const processedChunks = [];
                for (let i = 0; i < chunks.length; i++) {
                    try {
                        const embedding = await generateEmbeddings(chunks[i]);
                        processedChunks.push({
                            chunkIndex: i, text: chunks[i], embedding: embedding,
                            metadata: { issuerName, documentTitle: doc.title, documentUrl: doc.url, documentDate: doc.date, documentType: doc.type, processedAt: new Date().toISOString() }
                        });
                    } catch (e) { functions.logger.error(e); }
                }

                if (processedChunks.length > 0) {
                    const documentId = doc.title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
                    await storeDocumentChunks(issuerId, documentId, processedChunks);
                    processedCount++;
                }
            }
        } catch (error) {
            functions.logger.error(`Error processing document ${doc.title}:`, error);
            errorCount++;
            debugInfo.push({ title: doc.title, error: error.message, pdfParseContent: global.pdfParseContent });
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
