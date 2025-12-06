const { getFirestore } = require('firebase-admin/firestore');
const { generateEmbeddings, generateFinancialAnalysis, cosineSimilarity, FINANCIAL_PROMPTS } = require('../services/vertexAI');
const functions = require('firebase-functions');

/**
 * Busca documentos relevantes usando búsqueda vectorial
 * @param {string} query - Consulta del usuario
 * @param {string} issuerId - ID del emisor (opcional, para filtrar)
 * @param {number} topK - Número de resultados a retornar
 * @returns {Promise<object[]>} Chunks relevantes ordenados por similitud
 */
async function searchRelevantDocuments(query, issuerId = null, topK = 20) {
    try {
        // Generate embedding for the query
        const queryEmbedding = await generateEmbeddings(query);

        // Get all document chunks from Firestore
        const db = getFirestore();
        let chunksQuery = db.collection('documentChunks');

        if (issuerId) {
            chunksQuery = chunksQuery.where('issuerId', '==', issuerId);
        }

        // Prioritize recent documents
        chunksQuery = chunksQuery.orderBy('createdAt', 'desc').limit(500);

        const snapshot = await chunksQuery.get();

        if (snapshot.empty) {
            return [];
        }

        // Calculate similarity for each chunk
        const results = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            const similarity = cosineSimilarity(queryEmbedding, data.embedding);

            results.push({
                id: doc.id,
                similarity,
                text: data.text,
                metadata: data.metadata,
            });
        });

        // Sort by similarity and return top K
        results.sort((a, b) => b.similarity - a.similarity);
        return results.slice(0, topK);
    } catch (error) {
        functions.logger.error('Error in vector search:', error);
        throw new Error(`Search failed: ${error.message}`);
    }
}

/**
 * Construye contexto para el prompt basado en chunks relevantes
 * @param {object[]} relevantChunks 
 * @returns {string} Contexto formateado
 */
function buildContext(relevantChunks) {
    return relevantChunks.map((chunk, index) => {
        const { metadata, text } = chunk;
        return `
**Documento ${index + 1}:**
- Emisor: ${metadata.issuerName}
- Título: ${metadata.documentTitle}
- Tipo: ${metadata.documentType}
- Fecha: ${metadata.documentDate}

Contenido:
${text.substring(0, 800)}...
`;
    }).join('\n---\n');
}

/**
 * Maneja consulta general de RAG
 * @param {object} req - Request object
 * @param {object} res - Response object
 */
async function handleRAGQuery(req, res) {
    try {
        const { query, issuerId, analysisType } = req.body;

        if (!query) {
            return res.status(400).json({ error: 'Query is required' });
        }

        // Check if document chunks exist
        const db = getFirestore();
        const testSnapshot = await db.collection('documentChunks').limit(1).get();

        if (testSnapshot.empty) {
            return res.status(503).json({
                error: 'service_initializing',
                message: 'El sistema de IA aún está procesando documentos. Los embeddings se están generando en este momento. Por favor intenta de nuevo en 20-30 minutos.',
                estimatedTime: '20-30 minutos',
            });
        }

        // 1. Search for relevant documents
        let relevantChunks = [];

        if (analysisType === 'comparative' || (Array.isArray(issuerId) && issuerId.length > 1)) {
            // Comparative analysis logic
            const targetIssuers = Array.isArray(issuerId) ? issuerId : ['fama', 'banco de la produccion', 'banco de finanzas']; // Default comparison set

            for (const targetId of targetIssuers) {
                const issuerChunks = await searchRelevantDocuments(query, targetId, 10); // 10 chunks per issuer
                relevantChunks = [...relevantChunks, ...issuerChunks];
            }
        } else {
            // Single issuer logic
            relevantChunks = await searchRelevantDocuments(query, issuerId, 20);
        }

        if (relevantChunks.length === 0) {
            return res.json({
                answer: 'No se encontraron documentos relevantes para tu consulta. El sistema ya tiene documentos procesados, pero ninguno coincide con tu búsqueda. Por favor, intenta reformular la pregunta o especifica un emisor diferente.',
                sources: [],
                warningType: 'no_relevant_docs',
            });
        }

        // 2. Build context
        const context = buildContext(relevantChunks);

        // 3. Create prompt based on analysis type
        let prompt;
        if (analysisType === 'comparative') {
            const issuerNames = [...new Set(relevantChunks.map(c => c.metadata.issuerName))];
            const documents = relevantChunks.map(chunk => ({
                issuer: chunk.metadata.issuerName,
                title: chunk.metadata.documentTitle,
                date: chunk.metadata.documentDate,
                excerpt: chunk.text.substring(0, 500),
            }));

            prompt = FINANCIAL_PROMPTS.comparativeAnalysis(issuerNames, documents);
        } else if (analysisType && FINANCIAL_PROMPTS[analysisType]) {
            // Use specialized prompt
            const issuerName = relevantChunks[0].metadata.issuerName;
            const documents = relevantChunks.map(chunk => ({
                title: chunk.metadata.documentTitle,
                date: chunk.metadata.documentDate,
                excerpt: chunk.text.substring(0, 500),
            }));

            prompt = FINANCIAL_PROMPTS[analysisType](issuerName, documents);
        } else {
            // General query prompt with CoT
            prompt = FINANCIAL_PROMPTS.generalQuery(query, context);
        }

        // 4. Generate response
        const answer = await generateFinancialAnalysis(prompt, { maxTokens: 4096 });

        // 5. Extract unique documents and metadata
        const uniqueDocs = new Map();
        relevantChunks.forEach(chunk => {
            const docKey = chunk.metadata.documentTitle;
            if (!uniqueDocs.has(docKey)) {
                uniqueDocs.set(docKey, {
                    title: chunk.metadata.documentTitle,
                    type: chunk.metadata.documentType,
                    date: chunk.metadata.documentDate,
                    issuer: chunk.metadata.issuerName,
                    chunkCount: 1
                });
            } else {
                uniqueDocs.get(docKey).chunkCount++;
            }
        });

        // Extract years from document dates
        const years = new Set();
        relevantChunks.forEach(chunk => {
            const date = chunk.metadata.documentDate;
            if (date) {
                const yearMatch = date.match(/\d{4}/);
                if (yearMatch) years.add(yearMatch[0]);
            }
        });

        // 6. Return enhanced response with sources and metadata
        res.json({
            answer,
            sources: relevantChunks.map(chunk => ({
                documentTitle: chunk.metadata.documentTitle,
                issuerName: chunk.metadata.issuerName,
                documentType: chunk.metadata.documentType,
                documentDate: chunk.metadata.documentDate,
                similarity: chunk.similarity,
                excerpt: chunk.text.substring(0, 200),
            })),
            metadata: {
                totalChunksAnalyzed: relevantChunks.length,
                uniqueDocuments: Array.from(uniqueDocs.values()),
                uniqueDocumentCount: uniqueDocs.size,
                yearsFound: Array.from(years).sort().reverse(),
                analysisType: analysisType || 'general',
            },
            analysisType: analysisType || 'general',
        });

    } catch (error) {
        functions.logger.error('Error in RAG query:', error);
        res.status(500).json({
            error: 'Error processing query',
            message: error.message,
        });
    }
}

/**
 * Maneja análisis comparativo de múltiples emisores
 * @param {object} req 
 * @param {object} res 
 */
async function handleComparativeAnalysis(req, res) {
    try {
        const { issuerIds, analysisType } = req.body;

        if (!issuerIds || !Array.isArray(issuerIds) || issuerIds.length < 2) {
            return res.status(400).json({ error: 'At least 2 issuer IDs are required' });
        }

        // Get relevant documents for each issuer
        const issuerDocuments = {};
        const issuerNames = [];

        for (const issuerId of issuerIds) {
            const chunks = await searchRelevantDocuments(
                `estados financieros calificación riesgo`,
                issuerId,
                15
            );

            if (chunks.length > 0) {
                const issuerName = chunks[0].metadata.issuerName;
                issuerNames.push(issuerName);
                issuerDocuments[issuerName] = chunks.map(chunk => ({
                    title: chunk.metadata.documentTitle,
                    date: chunk.metadata.documentDate,
                    excerpt: chunk.text.substring(0, 500),
                }));
            }
        }

        // Use comparative prompt
        const prompt = FINANCIAL_PROMPTS.comparative(issuerNames, issuerDocuments);
        const analysis = await generateFinancialAnalysis(prompt, {
            maxTokens: 4096,
        });

        res.json({
            analysis,
            issuers: issuerNames,
            analysisType: 'comparative',
        });

    } catch (error) {
        functions.logger.error('Error in comparative analysis:', error);
        res.status(500).json({
            error: 'Error processing comparative analysis',
            message: error.message,
        });
    }
}

/**
 * Genera insights estratégicos para un emisor
 * @param {object} req 
 * @param {object} res 
 */
async function handleInsights(req, res) {
    try {
        const { issuerId } = req.params;

        if (!issuerId) {
            return res.status(400).json({ error: 'Issuer ID is required' });
        }

        // 1. Get most relevant/recent documents
        // We search for "resumen financiero hechos relevantes" to get a good mix
        const chunks = await searchRelevantDocuments(
            'estados financieros informe anual hechos relevantes',
            issuerId,
            10
        );

        if (chunks.length === 0) {
            return res.json({
                success: false,
                message: 'No hay suficientes documentos procesados para generar insights.'
            });
        }

        const documents = chunks.map(chunk => ({
            title: chunk.metadata.documentTitle,
            date: chunk.metadata.documentDate,
            excerpt: chunk.text.substring(0, 500),
        }));

        // 2. Generate Insight
        const prompt = FINANCIAL_PROMPTS.executiveSummary(issuerId, documents);

        // Force JSON mode in generation options if supported, otherwise rely on prompt
        const rawAnalysis = await generateFinancialAnalysis(prompt, {
            maxTokens: 1024,
            temperature: 0.2
        });

        // 3. Parse JSON
        let insights;
        try {
            // Clean markdown code blocks if present
            const jsonStr = rawAnalysis.replace(/```json/g, '').replace(/```/g, '').trim();
            insights = JSON.parse(jsonStr);
            insights.generatedAt = new Date().toISOString();

            // Validate structure
            if (!insights.citations) insights.citations = [];
            if (!insights.metrics) insights.metrics = [];

        } catch (e) {
            functions.logger.error('Failed to parse insight JSON:', rawAnalysis);
            // Fallback
            insights = {
                insight: rawAnalysis.substring(0, 200) + '...',
                sentiment: 'neutral',
                confidence: 0.5,
                metrics: [],
                citations: [],
                generatedAt: new Date().toISOString()
            };
        }

        res.json({
            success: true,
            insights
        });

    } catch (error) {
        functions.logger.error('Error in insights generation:', error);
        res.status(500).json({
            success: false,
            error: 'Error generating insights',
            message: error.message
        });
    }
}

module.exports = {
    handleRAGQuery,
    handleComparativeAnalysis,
    handleInsights,
    searchRelevantDocuments,
};
