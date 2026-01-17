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
            const text = data.text || data.extractedText || '';
            const title = md.title || md.documentTitle || data.factTitle || 'Desconocido';
            const date = md.documentDate || md.date || (data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt) || '';

            const isAuditedField = /audita|estados financier|informe de los auditores|prospecto|anual|memoria/i.test(title) ||
                /informe de los auditores|auditado/i.test(text.substring(0, 2000));
            const isFinancial = md.docType === 'FINANCIAL_REPORT' || /financiero|balance|resultado|patrimonio|pasivo|activo/i.test(text) || isAuditedField;

            return {
                id: doc.id,
                text,
                title,
                date,
                // flags
                isAudited: isAuditedField,
                isFinancial
            };
        });

        // Diversity Selection (Prioritize relevant chunks)
        const prioritizedChunks = chunks.sort((a, b) => {
            // Priority 1: Audited & Financial
            if ((a.isAudited && a.isFinancial) && !(b.isAudited && b.isFinancial)) return -1;
            if (!(a.isAudited && a.isFinancial) && (b.isAudited && b.isFinancial)) return 1;
            // Priority 2: Financial
            if (a.isFinancial && !b.isFinancial) return -1;
            if (!a.isFinancial && b.isFinancial) return 1;
            // Fallback: Date descending (if available) or existing order
            return 0;
        });

        const selectedChunks = prioritizedChunks.slice(0, 800);

        const context = selectedChunks.map(c => `\n---\nDOCUMENTO: ${c.title} | FECHA: ${c.date}\nCONTENIDO: ${c.text}`).join('\n').slice(0, 950000);

        const prompt = `
Eres un analista financiero Senior (CFA). Tu misión es reconstruir la serie histórica del emisor "${issuerName}" para el periodo 2021-2025.

CONTEXTO FINANCIERO (Fragmentos de múltiples reportes):
${context}

TAREA:
Extrae los datos de Activos Totales, Utilidad Neta y Patrimonio para cada uno de los años solicitados (2021, 2022, 2023, 2024, 2025).

REGLAS CRÍTICAS:
1. **Prioridad Auditada**: Los estados financieros auditados son la fuente de verdad absoluta.
2. **DATOS COMPARATIVOS**: Los reportes auditados suelen tener columnas comparativas (ej: Balance 2024 muestra datos de 2023). Úsalos para reconstruir años pasados con alta fidelidad.
3. **Punto en el tiempo (As of)**: Los Activos y Patrimonio deben ser al cierre del periodo (31 de diciembre o fecha más reciente disponible).
4. **Acumulado (YTD)**: La Utilidad Neta debe ser el total anual.
5. **Monedas**: Extrae el valor numérico bruto. No asumas moneda; si ves C$ es NIO, si ves $ es USD (a menos que diga lo contrario).
6. **2025**: Si hay datos trimestrales de 2025, úsalos como la cifra más reciente.

FORMATO JSON (ARRAY):
[
  { "period": "2021", "date": "2021-12-31", "activosTotales": number, "utilidadNeta": number, "patrimonio": number, "razonamiento": "..." },
  ...
]
`;

        const history = await callVertexAI(prompt, {
            temperature: 0,
            maxOutputTokens: 3500,
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

        // Write to Firestore with normalization
        let RATE = 36.62;
        try {
            const mDoc = await db.collection('system').doc('market_metadata').get();
            if (mDoc.exists && mDoc.data().exchangeRate) RATE = mDoc.data().exchangeRate;
        } catch (e) { }

        const convert = (val) => {
            if (val === null || val === undefined) return null;
            let num = typeof val === 'string' ? Number(val.replace(/[^0-9.-]/g, '')) : Number(val);
            if (isNaN(num)) return null;
            // If value is > 10B, it's almost certainly NIO and needs conversion
            if (num > 10000000000) return Number((num / RATE).toFixed(2));
            return num;
        };

        for (const point of validatedHistory) {
            const normalizedPoint = {
                ...point,
                activosTotales: convert(point.activosTotales),
                utilidadNeta: convert(point.utilidadNeta),
                patrimonio: convert(point.patrimonio),
                extractedAt: new Date()
            };
            batch.set(historyRef.doc(point.period), normalizedPoint, { merge: true });
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
