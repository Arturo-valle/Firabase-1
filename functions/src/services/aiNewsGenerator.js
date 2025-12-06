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
    const { callVertexAI } = require('../services/vertexAI');

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

        const { callVertexAI } = require('../services/vertexAI');

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
    const { callVertexAI } = require('../services/vertexAI');

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

module.exports = {
    generateNews,
    generateNewsForDocument,
    generateIssuerInsights,
    enhanceSearchQuery,
};
