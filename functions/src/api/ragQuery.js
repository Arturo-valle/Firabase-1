const { getFirestore } = require('firebase-admin/firestore');
const { generateEmbeddings, generateFinancialAnalysis, cosineSimilarity, FINANCIAL_PROMPTS } = require('../services/vertexAI');
const { RAG_RESPONSE_SCHEMA } = require('../services/aiSchemas');
const functions = require('firebase-functions');

const { getAliasesForIssuer, loadRemoteConfig } = require('../utils/issuerConfig');

/**
 * Busca documentos relevantes usando búsqueda vectorial
 * @param {string} query - Consulta del usuario
 * @param {string} issuerId - ID del emisor (opcional, para filtrar)
 * @param {number} topK - Número de resultados a retornar
 * @returns {Promise<object[]>} Chunks relevantes ordenados por similitud
 */
async function searchRelevantDocuments(query, issuerId = null, topK = 40) {
    try {
        // Generate embedding for the query
        const queryEmbedding = await generateEmbeddings(query);

        // Get all document chunks from Firestore
        // Get document chunks from both documentChunks and fact_vectors
        const db = getFirestore();
        const collections = ['documentChunks', 'fact_vectors'];
        const allSnapshots = [];

        for (const collName of collections) {
            let q = db.collection(collName);

            if (issuerId) {
                let targetIds = [issuerId];
                const aliases = getAliasesForIssuer(issuerId);
                targetIds = targetIds.concat(aliases);

                if (targetIds.length > 1) {
                    q = q.where('issuerId', 'in', targetIds);
                } else {
                    q = q.where('issuerId', '==', issuerId);
                }
            }

            q = q.limit(collName === 'fact_vectors' ? 500 : 1000);
            allSnapshots.push(await q.get());
        }

        if (allSnapshots.every(s => s.empty)) {
            return [];
        }

        // Group by year and calculate similarity
        const groups = {};
        const targetYears = ['2020', '2021', '2022', '2023', '2024'];

        allSnapshots.forEach(snapshot => {
            snapshot.forEach(doc => {
                const data = doc.data();
                if (!data.embedding) return; // Skip if no embedding

                const similarity = cosineSimilarity(queryEmbedding, data.embedding);
                const date = data.metadata?.documentDate || data.createdAt || "";
                let year = "Unknown";

                const yearMatch = date.toString().match(/\d{4}/);
                if (yearMatch) year = yearMatch[0];

                if (!groups[year]) groups[year] = [];
                groups[year].push({
                    id: doc.id,
                    similarity,
                    text: data.text || data.fact || data.content || "",
                    metadata: {
                        issuerName: data.metadata?.issuerName || data.issuerId || "Unknown",
                        documentTitle: data.metadata?.documentTitle || data.title || "Documento",
                        documentType: data.metadata?.documentType || data.type || "Info",
                        documentDate: data.metadata?.documentDate || date,
                        ...data.metadata
                    },
                });
            });
        });

        // Diversity Logic: Take top 5 per target year, then fill the rest with best overall
        let finalSelection = [];
        const usedIds = new Set();

        targetYears.forEach(year => {
            if (groups[year]) {
                const bestInYear = groups[year]
                    .sort((a, b) => b.similarity - a.similarity)
                    .slice(0, 5);

                bestInYear.forEach(item => {
                    finalSelection.push(item);
                    usedIds.add(item.id);
                });
            }
        });

        // Fill remaining slots (up to topK) with best remaining across all years
        const allRemaining = [];
        Object.values(groups).forEach(group => {
            group.forEach(item => {
                if (!usedIds.has(item.id)) {
                    allRemaining.push(item);
                }
            });
        });

        allRemaining.sort((a, b) => b.similarity - a.similarity);

        const leftoversNeeded = Math.max(0, topK - finalSelection.length);
        finalSelection = [...finalSelection, ...allRemaining.slice(0, leftoversNeeded)];

        // Final sort so the LLM sees the highly relevant ones first/last depending on positioning
        return finalSelection.sort((a, b) => b.similarity - a.similarity);
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
${text.substring(0, 1500)}...
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
        await loadRemoteConfig();
        const { query, issuerId, analysisType } = req.body;

        if (!query) {
            return res.status(400).json({ error: 'Query is required' });
        }

        // Check if document chunks exist
        // Check if ANY vectors exist in both primary collections
        const db = getFirestore();
        const [docSnap, factSnap] = await Promise.all([
            db.collection('documentChunks').limit(1).get(),
            db.collection('fact_vectors').limit(1).get()
        ]);

        if (docSnap.empty && factSnap.empty) {
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
            const { WHITELIST } = require('../utils/issuerConfig');
            const targetIssuers = Array.isArray(issuerId) ? issuerId : WHITELIST.slice(0, 3); // Use first 3 from whitelist as default comparison set

            for (const targetId of targetIssuers) {
                const issuerChunks = await searchRelevantDocuments(query, targetId, 20); // 20 chunks per issuer for comparison
                relevantChunks = [...relevantChunks, ...issuerChunks];
            }
        } else {
            // Single issuer logic (increased to 40 for better historical coverage)
            relevantChunks = await searchRelevantDocuments(query, issuerId, 40);
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

        // new step: Try to fetch verified metrics from structured collection
        let verifiedMetricsText = "";
        try {
            const yearMatch = query.match(/20\d\d/);
            const targetIssuerId = Array.isArray(issuerId) ? issuerId[0] : issuerId;
            if (yearMatch && targetIssuerId) {
                const year = yearMatch[0];
                const metricsDocId = `${targetIssuerId}_${year}`;
                const metricDoc = await db.collection('financialMetrics').doc(metricsDocId).get();

                if (metricDoc.exists) {
                    const data = metricDoc.data();
                    verifiedMetricsText = `\nDATOS FINANCIEROS VERIFICADOS (ALTA PRIORIDAD - ÚSALOS PREFERENTEMENTE):\nEmisor: ${data.issuerName || targetIssuerId} Año: ${data.year}\n${JSON.stringify(data.metrics, null, 2)}\nFuente: ${data.sourceDocument || 'Base de Datos Verificada'}\n`;
                    functions.logger.info(`Injecting verified metrics for ${targetIssuerId} ${year}`);
                }
            }
        } catch (e) {
            functions.logger.warn('Error fetching verified metrics:', e);
        }

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
            // General query prompt with CoT and enhanced logic
            prompt = `Eres un analista financiero senior del mercado de valores de Nicaragua.
Tu tarea es EXTRAER Y REPORTAR datos específicos del contexto proporcionado.

HECHOS VERIFICADOS (Prioridad Máxima):
${verifiedMetricsText || "No hay datos verificados específicamente para el año mencionado en la base de datos estructurada."}

CONTEXTO (Documentos Financieros Oficiales):
${context}

CONSULTA DEL USUARIO: "${query}"

DICCIONARIO DE SINÓNIMOS FINANCIEROS NICARAGÜENSES:
- "Utilidad Neta" = "Resultado del Ejercicio" = "Ganancia Neta"
- "Activos Totales" = "Total Activo"
- "Patrimonio" = "Capital Contable"

INSTRUCCIONES PARA LA SALIDA ESTRUCTURADA:
1. **answer**: Tu respuesta narrativa detallada en Markdown. Incluye tablas Markdown si es necesario. Cita fuentes [Documento Año].
2. **structuredData**: Crucial para gráficas.
   - **creditRating**: Si detectas calificaciones históricas (ej: AAA en 2023, AA+ en 2024), lístalas.
   - **ratios**: Extrae ROE, ROA, Eficiencia, Liquidez, etc.
   - **riskScores**: Evalúa de 1 a 10 las categorías de riesgo (Crediticio, Mercado, Operacional) basado exclusivamente en el contexto.
   - **comparative**: Si la consulta es comparativa, agrupa métricas clave por emisor.
3. **suggestedQueries**: 3 preguntas lógicas de seguimiento.

REGLAS ESTRICTAS:
- USA SOLO datos del contexto o de los HECHOS VERIFICADOS. NO inventes cifras.
- SIEMPRE incluye el monto exacto cuando exista (ej: C$ 175,127,432).
- SIEMPRE cita la fuente del documento y fecha.
- Si NO encuentras el dato específico, indica: "Los documentos no contienen [dato específico]."
- NO te auto-identifiques como IA.`;
        }

        // 4. Generate structured response
        const aiResponse = await generateFinancialAnalysis(prompt, {
            maxTokens: 4096,
            responseSchema: RAG_RESPONSE_SCHEMA
        });

        const { answer, structuredData, suggestedQueries } = aiResponse;

        // 4.1 Coverage Validation (Internal Audit)
        const yearsFoundInText = [];
        ['2020', '2021', '2022', '2023', '2024'].forEach(y => {
            if (answer.includes(y)) yearsFoundInText.push(y);
        });

        // 5. Extract unique documents and metadata
        const uniqueDocs = new Map();
        const years = new Set();

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

            // Extract years from document dates
            const date = chunk.metadata.documentDate;
            if (date) {
                const yearMatch = date.match(/\d{4}/);
                if (yearMatch) years.add(yearMatch[0]);
            }
        });

        functions.logger.info('RAG_AUDIT_LOG', {
            issuerId,
            query,
            totalChunksAnalyzed: relevantChunks.length,
            yearsInContext: Array.from(years).sort(),
            yearsInAnswer: yearsFoundInText,
            coverageRatio: (yearsFoundInText.length / 5).toFixed(2)
        });

        // 6. Return enhanced response with sources and metadata
        res.json({
            answer,
            structuredData, // NEW: Standardized charts data
            suggestedQueries,
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
            coverage: {
                detectedYears: yearsFoundInText,
                missingTargetYears: ['2020', '2021', '2022', '2023', '2024'].filter(y => !yearsFoundInText.includes(y))
            }
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
                20
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

        // We search for "resumen financiero hechos relevantes" to get a good mix
        const chunks = await searchRelevantDocuments(
            'estados financieros informe anual hechos relevantes',
            issuerId,
            20
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
