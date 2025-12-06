// Metrics Extraction Service - Extract structured financial data from processed documents
const { getFirestore } = require('firebase-admin/firestore');
const { generateFinancialAnalysis: callVertexAI } = require('./vertexAI');
const functions = require('firebase-functions');

/**
 * Extract structured financial metrics from document chunks using Gemini
 * @param {string} issuerId - Issuer ID
 * @param {string} issuerName - Issuer name
 * @returns {Object} Extracted metrics
 */
async function extractIssuerMetrics(issuerId, issuerName) {
    const db = getFirestore();

    try {
        // Get recent chunks for this issuer
        const chunksSnapshot = await db.collection('documentChunks')
            .where('issuerId', '==', issuerId)
            .orderBy('createdAt', 'desc')
            .limit(50) // Top 50 most recent chunks
            .get();

        if (chunksSnapshot.empty) {
            functions.logger.warn(`No document chunks found for issuer ${issuerId}. Documents might not be processed yet.`);
            return { error: 'No processed documents found. Please trigger document processing first.' };
        }

        // Concatenate chunks for context
        const context = chunksSnapshot.docs
            .map(doc => doc.data().text)
            .join('\n\n')
            .slice(0, 20000); // Increased limit for better context

        const prompt = `Eres un analista financiero experto. Extrae las métricas financieras numéricas MÁS RECIENTES disponibles en estos documentos de ${issuerName}.

DOCUMENTOS (ordenados del más reciente al más antiguo):
${context}

Extrae y estructura en JSON:
{
  "liquidez": {
    "ratioCirculante": número o null,
    "pruebaAcida": número o null,
    "capitalTrabajo": número o null
  },
  "solvencia": {
    "deudaActivos": número (%) o null,
    "deudaPatrimonio": número o null,
    "coberturIntereses": número o null
  },
  "rentabilidad": {
    "roe": número (%) o null,
    "roa": número (%) o null,
    "margenNeto": número (%) o null,
    "utilidadNeta": número o null
  },
  "eficiencia": {
    "rotacionActivos": número o null,
    "rotacionCartera": número o null,
    "morosidad": número (%) o null
  },
  "capital": {
    "activosTotales": número o null,
    "patrimonio": número o null,
    "pasivos": número o null
  },
  "calificacion": {
    "rating": "AA", "A+", etc. o null,
    "perspectiva": "stable", "positive", "negative" o null,
    "fecha": "YYYY-MM" o null
  },
  "metadata": {
    "periodo": "YYYY" o "Q1 YYYY" (El más reciente encontrado),
    "moneda": "NIO" o "USD",
    "fuente": "nombre del documento más reciente"
  }
}

IMPORTANTE:
- Prioriza SIEMPRE los datos del periodo MÁS RECIENTE disponible.
- Ignora datos de años anteriores si hay datos más recientes.
- Solo incluye valores que encuentres EXPLÍCITAMENTE.
- Usa null si no encuentras el dato.
- Los porcentajes en formato decimal (ej: 15.5 para 15.5%).
- Montos en millones si es grande (ej: 1250.5 para C$1,250.5M).`;

        const response = await callVertexAI(prompt, {
            temperature: 0.1, // Very low for factual extraction
            maxOutputTokens: 800,
        });

        // Parse JSON response
        const match = response.match(/\{[\s\S]*\}/);
        if (match) {
            const metrics = JSON.parse(match[0]);

            // Store in Firestore
            await db.collection('issuerMetrics').doc(issuerId).set({
                ...metrics,
                issuerId,
                issuerName,
                extractedAt: new Date(),
                chunksAnalyzed: chunksSnapshot.size,
            }, { merge: true });

            functions.logger.info(`Metrics extracted for ${issuerName}:`, metrics);
            return metrics;
        } else {
            throw new Error('Could not parse metrics from AI response');
        }
    } catch (error) {
        functions.logger.error(`Error extracting metrics for ${issuerName}:`, error);
        throw error;
    }
}

/**
 * Extract metrics for all active issuers
 */
async function extractAllMetrics() {
    const db = getFirestore();
    const issuersSnapshot = await db.collection('issuers')
        .where('isActive', '==', true)
        .get();

    const results = [];

    for (const issuerDoc of issuersSnapshot.docs) {
        const issuerData = issuerDoc.data();

        // Only process if has documents
        if (issuerData.documentsProcessed > 0) {
            try {
                const metrics = await extractIssuerMetrics(issuerDoc.id, issuerData.name);
                results.push({
                    issuerId: issuerDoc.id,
                    issuerName: issuerData.name,
                    success: true,
                    metrics,
                });
            } catch (error) {
                results.push({
                    issuerId: issuerDoc.id,
                    issuerName: issuerData.name,
                    success: false,
                    error: error.message,
                });
            }

            // Delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }

    return results;
}

/**
 * Get cached metrics for an issuer
 */
async function getIssuerMetrics(issuerId) {
    const db = getFirestore();
    const metricsDoc = await db.collection('issuerMetrics').doc(issuerId).get();

    if (!metricsDoc.exists) {
        return null;
    }

    return metricsDoc.data();
}

/**
 * Compare metrics across multiple issuers
 */
async function compareIssuerMetrics(issuerIds) {
    const db = getFirestore();
    const comparisons = [];

    for (const issuerId of issuerIds) {
        const metrics = await getIssuerMetrics(issuerId);
        if (metrics) {
            comparisons.push({
                issuerId: metrics.issuerId,
                issuerName: metrics.issuerName,
                metrics: metrics,
            });
        }
    }

    return comparisons;
}

/**
 * Extract historical time-series metrics from document chunks
 * @param {string} issuerId - Issuer ID
 * @param {string} issuerName - Issuer name
 */
async function extractHistoricalMetrics(issuerId, issuerName) {
    const db = getFirestore();

    try {
        // Get a larger set of recent chunks to cover more history
        const chunksSnapshot = await db.collection('documentChunks')
            .where('issuerId', '==', issuerId)
            .orderBy('createdAt', 'desc')
            .limit(100) // Increased limit for history
            .get();

        if (chunksSnapshot.empty) {
            functions.logger.warn(`No document chunks found for issuer ${issuerId}.`);
            return null;
        }

        const context = chunksSnapshot.docs
            .map(doc => doc.data().text)
            .join('\n\n')
            .slice(0, 30000); // Increased token window for history

        const prompt = `Eres un analista de datos financieros. Tu trabajo es construir una serie de tiempo histórica para ${issuerName} basada en los documentos proporcionados.

DOCUMENTOS DISPONIBLES:
${context}

TAREA:
Extrae los datos financieros clave para CADA periodo (Trimestre/Año) que encuentres en el texto. Ignora proyecciones futuras.

FORMATO JSON ESPERADO:
{
  "history": [
    {
      "period": "Q3 2024" (o "2023", "Marzo 2024", etc.),
      "date": "YYYY-MM-DD" (Fecha de cierre del periodo, aprox si es necesario),
      "activosTotales": número o null,
      "patrimonio": número o null,
      "utilidadNeta": número o null,
      "ingresosTotales": número o null,
      "roe": número (%) o null,
      "liquidez": number (ratio) o null
    }
  ]
}

REGLAS:
1. Ordena cronológicamente descendente (más reciente primero).
2. Trata de extraer al menos los últimos 4-8 periodos si están disponibles.
3. Si hay conflictos, prioriza los documentos con fecha más reciente.
4. Normaliza los montos a la misma escala si es posible (indica si son millones en el contexto, pero devuelve el número puro).`;

        const response = await callVertexAI(prompt, {
            temperature: 0.1,
            maxOutputTokens: 2048, // More tokens for array output
        });

        const match = response.match(/\{[\s\S]*\}/);
        if (match) {
            const data = JSON.parse(match[0]);

            // Save to Firestore - Subcollection for history to avoid document size limits
            const batch = db.batch();
            const historyRef = db.collection('issuerMetrics').doc(issuerId).collection('history');

            // Delete old history first (simplification for MVP)
            const oldHistory = await historyRef.listDocuments();
            oldHistory.forEach(doc => batch.delete(doc));

            if (data.history && Array.isArray(data.history)) {
                data.history.forEach(item => {
                    const docId = item.period.replace(/[^a-zA-Z0-9]/g, '_');
                    batch.set(historyRef.doc(docId), item);
                });

                await batch.commit();
                functions.logger.info(`Extracted ${data.history.length} historical periods for ${issuerName}`);
                return data.history;
            }
        }
    } catch (error) {
        functions.logger.error(`Error extracting historical metrics for ${issuerName}:`, error);
        throw error;
    }
}

/**
 * Get historical metrics for an issuer
 * @param {string} issuerId 
 */
async function getIssuerHistory(issuerId) {
    const db = getFirestore();
    try {
        const historySnapshot = await db.collection('issuerMetrics')
            .doc(issuerId)
            .collection('history')
            .orderBy('date', 'desc') // Most recent first
            .get();

        if (historySnapshot.empty) {
            return [];
        }

        return historySnapshot.docs.map(doc => doc.data());
    } catch (error) {
        functions.logger.error(`Error getting history for ${issuerId}:`, error);
        return [];
    }
}

module.exports = {
    extractIssuerMetrics,
    extractAllMetrics,
    getIssuerMetrics,
    compareIssuerMetrics,
    extractHistoricalMetrics,
    getIssuerHistory
};
