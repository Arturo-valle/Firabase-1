// AI News Generator - Backend Cloud Function
// Generates Bloomberg-style financial news from processed documents

const functions = require('firebase-functions');
const { getFirestore } = require('firebase-admin/firestore');

/**
 * Generate AI-powered news feed from recently processed documents
 * @param {number} daysBack - Number of days to look back for documents (default: 7)
 * @returns {Array} Array of generated news items
 */
async function generateNews(daysBack = 7) {
    const db = getFirestore();

    try {
        // Get recently processed documents
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysBack);

        // Query Firestore for recent documents
        const issuersSnapshot = await db.collection('issuers').get();
        const recentDocs = [];

        for (const issuerDoc of issuersSnapshot.docs) {
            const issuerData = issuerDoc.data();
            const lastProcessed = issuerData.lastProcessed?.toDate();

            if (lastProcessed && lastProcessed >= cutoffDate) {
                const documents = issuerData.documents || [];
                // Get last 3 documents per issuer
                const sortedDocs = documents
                    .filter(d => d.date)
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .slice(0, 3);

                sortedDocs.forEach(doc => {
                    recentDocs.push({
                        ...doc,
                        issuerId: issuerDoc.id,
                        issuerName: issuerData.name,
                    });
                });
            }
        }

        functions.logger.info(`Found ${recentDocs.length} recent documents to generate news from`);

        // Generate news items using Gemini
        const newsItems = [];

        for (const doc of recentDocs.slice(0, 10)) { // Limit to 10 most recent
            try {
                const newsItem = await generateNewsForDocument(doc);
                if (newsItem) {
                    newsItems.push(newsItem);
                }
            } catch (error) {
                functions.logger.error(`Error generating news for ${doc.title}:`, error);
            }
        }

        return newsItems;
    } catch (error) {
        functions.logger.error('Error in generateNews:', error);
        throw error;
    }
}

/**
 * Generate a single news item from a document using Gemini
 */
async function generateNewsForDocument(doc) {
    const { generateFinancialAnalysis: callVertexAI } = require('../services/vertexAI');

    const prompt = `Eres un analista financiero experto escribiendo para Bloomberg en español.

Basado en este documento financiero nicaragüense:
- Emisor: ${doc.issuerName}
- Tipo: ${doc.type || 'Documento Financiero'}
- Título: ${doc.title}
- Fecha: ${doc.date}

Genera:
1. Un titular conciso estilo Bloomberg (máximo 80 caracteres)
2. Un resumen de 2 líneas destacando lo MÁS relevante para inversionistas
3. Una categoría: "rating", "financials", "market", o "announcement"

Formato JSON:
{
  "headline": "...",
  "summary": "...",
  "category": "..."
}

IMPORTANTE: Solo hechos, no especulación. Enfócate en datos concretos.`;

    try {
        const response = await callVertexAI(prompt, {
            temperature: 0.3, // Low temperature for factual content
            maxOutputTokens: 200,
        });

        // Parse JSON response
        const match = response.match(/\{[\s\S]*\}/);
        if (match) {
            const newsData = JSON.parse(match[0]);

            return {
                id: `${doc.issuerId}-${Date.now()}`,
                headline: newsData.headline,
                summary: newsData.summary,
                category: newsData.category,
                issuers: [doc.issuerName],
                issuerIds: [doc.issuerId],
                documentSource: doc.title,
                timestamp: new Date(),
                isAIGenerated: true,
            };
        }
    } catch (error) {
        functions.logger.error('Error calling Gemini for news generation:', error);
        return null;
    }

    return null;
}

/**
 * Generate AI insights for an issuer based on their documents
 */
async function generateIssuerInsights(issuerId, issuerName) {
    const db = getFirestore();

    try {
        // Get issuer's chunks for context
        const chunksSnapshot = await db.collection('documentChunks')
            .where('issuerId', '==', issuerId)
            .orderBy('timestamp', 'desc')
            .limit(20)
            .get();

        if (chunksSnapshot.empty) {
            return null;
        }

        // Concatenate recent chunks for context
        const context = chunksSnapshot.docs
            .map(doc => doc.data().text)
            .join('\n\n')
            .slice(0, 4000); // Limit context size

        const { generateFinancialAnalysis: callVertexAI } = require('../services/vertexAI');

        const prompt = `Eres un analista financiero experto analizando ${issuerName} en Nicaragua.

Basado en estos extractos de documentos financieros recientes:

${context}

Genera un insight clave en formato JSON:
{
  "insight": "Una observación concisa de 1-2 líneas sobre la salud financiera",
  "sentiment": "positive" | "negative" | "neutral",
  "confidence": 0.0-1.0,
  "metrics": ["métrica1", "métrica2"]
}

Enfócate en tendencias, ratios financieros, o cambios significativos.`;

        const response = await callVertexAI(prompt, {
            temperature: 0.4,
            maxOutputTokens: 150,
        });

        const match = response.match(/\{[\s\S]*\}/);
        if (match) {
            const insightData = JSON.parse(match[0]);
            return {
                issuerId,
                issuerName,
                ...insightData,
                generatedAt: new Date(),
            };
        }
    } catch (error) {
        functions.logger.error(`Error generating insights for ${issuerName}:`, error);
        return null;
    }

    return null;
}

/**
 * Analyze search query and enhance with AI understanding
 */
async function enhanceSearchQuery(query) {
    const { generateFinancialAnalysis: callVertexAI } = require('../services/vertexAI');

    const prompt = `Eres un asistente de búsqueda financiera para el mercado nicaragüense.

Query del usuario: "${query}"

Extrae y estructura la intención:
{
  "intent": "search_issuer" | "compare_issuers" | "analyze_metric" | "general_query",
  "issuers": ["emisores mencionados"],
  "metrics": ["métricas financieras mencionadas"],
  "timeframe": "período temporal si se menciona",
  "enhancedQuery": "query reformulada para mejor búsqueda"
}`;

    try {
        const response = await callVertexAI(prompt, {
            temperature: 0.2,
            maxOutputTokens: 200,
        });

        const match = response.match(/\{[\s\S]*\}/);
        if (match) {
            return JSON.parse(match[0]);
        }
    } catch (error) {
        functions.logger.error('Error enhancing search query:', error);
    }

    return {
        intent: 'general_query',
        issuers: [],
        metrics: [],
        timeframe: null,
        enhancedQuery: query,
    };
}

/**
 * Handle AI Query with RAG (Retrieval Augmented Generation)
 * @param {string} query - User's natural language query
 * @param {string|Array} issuerId - Specific issuer ID(s) to focus on (optional)
 * @param {string} analysisType - Type of analysis (general, financial, creditRating, comparative)
 */
async function handleAIQuery(query, issuerId = null, analysisType = 'general') {
    const db = getFirestore();
    const { generateFinancialAnalysis: callVertexAI } = require('../services/vertexAI');
    const { generateEmbeddings, cosineSimilarity } = require('../services/vertexAI');

    try {
        // 1. Generate embedding for the user's query
        let queryEmbedding = null;
        try {
            queryEmbedding = await generateEmbeddings(query);
        } catch (embError) {
            functions.logger.warn('Could not generate query embedding, falling back to timestamp-based retrieval:', embError.message);
        }

        // 2. Fetch candidate chunks
        let chunks = [];
        let issuerNames = [];

        // Handle single or multiple issuer IDs
        const issuerIds = Array.isArray(issuerId) ? issuerId : (issuerId ? [issuerId] : []);

        if (issuerIds.length > 0) {
            // Fetch chunks for specific issuers
            for (const id of issuerIds) {
                // Get issuer name for context
                const issuerDoc = await db.collection('issuers').doc(id).get();
                if (issuerDoc.exists) issuerNames.push(issuerDoc.data().name);

                // Get more chunks for vector search (we'll rank them)
                const snapshot = await db.collection('documentChunks')
                    .where('issuerId', '==', id)
                    .limit(50) // Get more candidates for ranking
                    .get();

                snapshot.forEach(doc => chunks.push({ ...doc.data(), issuerId: id, docId: doc.id }));
            }
        } else {
            // Broad search across all issuers - get recent chunks
            const snapshot = await db.collection('documentChunks')
                .limit(100) // Get candidates for ranking
                .get();

            snapshot.forEach(doc => chunks.push({ ...doc.data(), docId: doc.id }));
        }

        // 3. Rank chunks by semantic similarity (if embedding available)
        if (queryEmbedding && chunks.length > 0) {
            // Calculate similarity scores
            const scoredChunks = chunks
                .filter(chunk => chunk.embedding && Array.isArray(chunk.embedding))
                .map(chunk => {
                    try {
                        const similarity = cosineSimilarity(queryEmbedding, chunk.embedding);
                        return { ...chunk, similarity };
                    } catch (e) {
                        return { ...chunk, similarity: 0 };
                    }
                });

            // Sort by similarity (highest first) and take top results
            scoredChunks.sort((a, b) => b.similarity - a.similarity);
            chunks = scoredChunks.slice(0, 15); // Top 15 most relevant chunks

            functions.logger.info(`Vector search: Selected top ${chunks.length} chunks by semantic similarity (max score: ${chunks[0]?.similarity?.toFixed(3) || 'N/A'})`);
        } else if (chunks.length > 0) {
            // Fallback: sort by date if available, limit to 10
            chunks = chunks.slice(0, 10);
            functions.logger.info('Fallback: Using recent chunks without semantic ranking');
        }

        // new step: Try to fetch verified metrics from structured collection (Rec 3)
        let verifiedMetricsText = "";
        try {
            const yearMatch = query.match(/20\d\d/);
            if (yearMatch && issuerIds.length === 1) {
                const year = yearMatch[0];
                const metricsDocId = `${issuerIds[0]}_${year}`;
                const metricDoc = await db.collection('financialMetrics').doc(metricsDocId).get();

                if (metricDoc.exists) {
                    const data = metricDoc.data();
                    verifiedMetricsText = `\nDATOS FINANCIEROS VERIFICADOS (ALTA PRIORIDAD - ÚSALOS PREFERENTEMENTE):\nEmisor: ${data.issuerName} Año: ${data.year}\n${JSON.stringify(data.metrics, null, 2)}\nFuente: ${data.sourceDocument || 'Base de Datos Verificada'}\n`;
                    functions.logger.info(`Injecting verified metrics for ${issuerIds[0]} ${year}`);
                }
            }
        } catch (e) {
            functions.logger.warn('Error fetching verified metrics:', e);
        }

        // 3. Format Context with more text per chunk
        const contextText = chunks.map((c, i) =>
            `--- DOCUMENTO ${i + 1} ---
Fuente: ${c.metadata?.documentTitle || c.source || 'Documento'}
Fecha: ${c.metadata?.documentDate || c.date || 'S/F'}
Emisor: ${c.metadata?.issuerName || c.issuerId || 'N/A'}
Contenido:
${c.text.slice(0, 1200)}
---`
        ).join('\n\n');

        // 4. Construct Prompt with better guidance
        const basePrompt = `Eres un analista financiero senior del mercado de valores de Nicaragua.
Tu tarea es EXTRAER Y REPORTAR datos específicos del contexto proporcionado.

HECHOS VERIFICADOS (Prioridad Máxima):
${verifiedMetricsText || "No hay datos verificados disponibles."}

CONTEXTO (Documentos Financieros Oficiales):
CONTEXTO (Documentos Financieros Oficiales):
${contextText || "No hay documentos específicos disponibles."}

CONSULTA DEL USUARIO: "${query}"

DICCIONARIO DE SINÓNIMOS FINANCIEROS NICARAGÜENSES:
(Usa estos equivalentes al buscar en el contexto)
- "Utilidad Neta" = "Resultado del Ejercicio" = "Ganancia Neta" = "Utilidad del Periodo"
- "Ingresos" = "Ingresos Operativos" = "Ingresos Financieros"
- "ROE" = "Rentabilidad sobre Patrimonio"
- "ROA" = "Rentabilidad sobre Activos"  
- "Activos Totales" = "Total Activo"
- "Patrimonio" = "Capital Contable" = "Patrimonio Neto"

PROCESO DE ANÁLISIS OBLIGATORIO:
1. PRIMERO: Identifica los sinónimos aplicables a la consulta del usuario.
2. SEGUNDO: Busca en el contexto usando TODOS los sinónimos posibles.
3. TERCERO: Extrae cifras exactas con formato C$ y fechas.
4. CUARTO: Presenta los datos en formato estructurado (tabla preferible).

REGLAS ESTRICTAS:
- USA SOLO datos del contexto. NO inventes cifras.
- SIEMPRE incluye el monto exacto cuando exista (ej: C$ 175,127,432).
- SIEMPRE cita la fuente del documento y fecha.
- Si encuentras el dato (usando sinónimos), repórtalo directamente.
- Si NO encuentras el dato específico, indica: "Los documentos no contienen [dato específico]."
- NO te auto-identifiques como IA.

RESPUESTA (Markdown):`;

        // 5. Call Vertex AI with lower temperature for consistency
        const answer = await callVertexAI(basePrompt, {
            temperature: 0.1, // Much lower for consistent, precise extraction
            maxOutputTokens: 1500 // More space for detailed response
        });

        // 5. Structure Response
        return {
            answer: answer,
            sources: chunks.map(c => ({
                title: c.source || 'Documento',
                date: c.date,
                issuer: c.issuerId
            })),
            metadata: {
                totalChunksAnalyzed: chunks.length,
                uniqueDocumentCount: new Set(chunks.map(c => c.source)).size,
                yearsFound: [...new Set(chunks.map(c => c.date ? c.date.substring(0, 4) : 'N/A'))]
            }
        };

    } catch (error) {
        functions.logger.error('Error in handleAIQuery:', error);
        throw new Error("Failed to process AI query");
    }
}

module.exports = {
    generateNews,
    generateNewsForDocument,
    generateIssuerInsights,
    enhanceSearchQuery,
    handleAIQuery
};
