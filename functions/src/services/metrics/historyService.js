const { getFirestore } = require('firebase-admin/firestore');
const { generateFinancialAnalysis: callVertexAI, AI_CONFIG } = require('../vertexAI');
const functions = require('firebase-functions');
const { HISTORICAL_METRICS_SCHEMA } = require('../aiSchemas');
const { findIssuerId, loadRemoteConfig } = require("../../utils/issuerConfig");

// Helper (will duplicate for now to keep independent, or move to utils shared later)
const parseDate = (dateStr) => {
    if (!dateStr) return { time: 0, year: null };
    let d = new Date(dateStr);
    if (!isNaN(d.getTime())) return { time: d.getTime(), year: d.getFullYear() };
    const yearMatch = String(dateStr).match(/(20\d{2})/);
    if (yearMatch) {
        const year = parseInt(yearMatch[0]);
        return { time: new Date(year, 0, 1).getTime(), year };
    }
    return { time: 0, year: null };
};

/**
 * Extract historical metrics time-series (Quarterly/Annual)
 */
async function extractHistoricalMetrics(issuerId, issuerName) {
    functions.logger.info(`SERVICE: Historical Extraction V2 - ${issuerName}`);
    const db = getFirestore();
    const config = await loadRemoteConfig();

    try {
        const canonicalId = findIssuerId(issuerId) || issuerId;
        const candidates = config.EXTRACTION_MAPPING[canonicalId] || [canonicalId];

        // Resolving source ID logic
        let sourceId = null;
        for (const candidate of candidates) {
            const snap = await db.collection('documentChunks').where('issuerId', '==', candidate).limit(1).get();
            if (!snap.empty) {
                sourceId = candidate;
                break;
            }
        }

        if (!sourceId) {
            functions.logger.warn(`No sourceId found for ${issuerName}`);
            return null;
        }

        // Fetch docs
        const collections = ['documentChunks', 'fact_vectors'];
        let allDocs = [];
        for (const collName of collections) {
            const snap = await db.collection(collName)
                .where('issuerId', 'in', candidates)
                .limit(collName === 'fact_vectors' ? 2500 : 3500)
                .get();
            allDocs = allDocs.concat(snap.docs);
        }

        // Sort in memory
        allDocs.sort((a, b) => {
            const dateA = a.data().createdAt?.toDate ? a.data().createdAt.toDate() : new Date(a.data().createdAt || 0);
            const dateB = b.data().createdAt?.toDate ? b.data().createdAt.toDate() : new Date(b.data().createdAt || 0);
            return dateB - dateA;
        });

        // Map chunks
        const chunks = allDocs.map(doc => {
            const data = doc.data();
            const md = data.metadata || {};
            return {
                id: doc.id,
                text: data.text,
                title: md.title || md.documentTitle || 'Desconocido',
                date: md.documentDate || md.date,
                // flags
                isAudited: /auditado|estados financieros/i.test(md.title || ''),
                isFinancial: md.docType === 'FINANCIAL_REPORT' || /financiero/i.test(data.text)
            };
        });

        // Diversity Selection (Top 1000 chunks logic)
        const selectedChunks = chunks.slice(0, 1000); // Simplified for refactor PoC, can restore full logic

        const context = selectedChunks.map(c => `\n---\nDOCUMENTO: ${c.title} | FECHA: ${c.date}\nCONTENIDO: ${c.text}`).join('\n').slice(0, 900000);

        const prompt = `
Eres un analista financiero Senior (CFA). Tu misión es reconstruir la serie histórica del emisor "${issuerName}" para el periodo 2021-2025.

CONTEXTO FINANCIERO (Fragmentos de múltiples reportes):
${context}

TAREA:
Extrae los datos de Activos Totales, Utilidad Neta y Patrimonio para cada uno de los años solicitados (2021, 2022, 2023, 2024, 2025).

REGLAS DE ORO:
1. **Prioridad Auditada**: Los estados financieros auditados son la fuente de verdad. 
2. **DATOS COMPARATIVOS**: Usa columnas comparativas ("2023" en reporte 2024) para reconstruir el pasado.
3. **2025**: Busca reportes trimestrales.
4. **Monedas**: Extrae valor bruto.

FORMATO JSON (ARRAY):
[
  { "period": "2021", "date": "2021-12-31", "activosTotales": number, "utilidadNeta": number, "patrimonio": number, "razonamiento": "..." },
  ...
]
`;

        const history = await callVertexAI(prompt, {
            temperature: 0,
            maxOutputTokens: 3000,
            model: AI_CONFIG.REASONING_MODEL,
            responseSchema: HISTORICAL_METRICS_SCHEMA
        });

        // Save to Firestore
        const batch = db.batch();
        const historyRef = db.collection('issuerMetrics').doc(sourceId).collection('history');

        // Validation logic
        const targetYears = [2021, 2022, 2023, 2024, 2025];
        const validatedHistory = targetYears.map(year => {
            const found = history.find(h => String(h.period) === String(year));
            return found || { period: String(year), date: `${year}-12-31`, activosTotales: null, utilidadNeta: null, patrimonio: null };
        });

        for (const point of validatedHistory) {
            batch.set(historyRef.doc(point.period), { ...point, extractedAt: new Date() }, { merge: true });
        }
        await batch.commit();

        return validatedHistory;

    } catch (error) {
        functions.logger.error(`Error en extractHistoricalMetrics para ${issuerName}:`, error);
        return [];
    }
}

/**
 * Get cached metrics for an issuer with logic to merge current and historical
 */
async function getIssuerHistory(issuerId) {
    const db = getFirestore();
    // Simplified fetch logic for refactor
    const snap = await db.collection('issuerMetrics').doc(issuerId).collection('history').orderBy('period', 'asc').get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

module.exports = { extractHistoricalMetrics, getIssuerHistory };
