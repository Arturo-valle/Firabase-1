const { getFirestore } = require('firebase-admin/firestore');
const { generateFinancialAnalysis: callVertexAI, AI_CONFIG } = require('../vertexAI');
const functions = require('firebase-functions');
const { METRICS_EXTRACTION_SCHEMA } = require('../aiSchemas');
const { findIssuerId, loadRemoteConfig } = require("../../utils/issuerConfig");

/**
 * Extract structured financial metrics from document chunks using Gemini
 */
async function extractIssuerMetrics(issuerId, issuerName, sourceId = null) {
    try {
        const db = getFirestore();
        const config = await loadRemoteConfig();

        const canonicalId = findIssuerId(issuerId) || issuerId;
        const candidates = config.EXTRACTION_MAPPING[canonicalId] || [canonicalId];

        // Resolving source ID logic
        if (!sourceId) {
            for (const candidate of candidates) {
                const snap = await db.collection('documentChunks')
                    .where('issuerId', '==', candidate)
                    .limit(1)
                    .get();

                if (!snap.empty) {
                    sourceId = candidate;
                    break;
                }
            }
        }

        if (!sourceId) {
            functions.logger.warn(`No document chunks found for issuer ${issuerName} (${issuerId}). Cannot extract metrics.`);
            return { error: 'No processed documents found.' };
        }

        // Get recent chunks
        const collections = ['documentChunks', 'fact_vectors'];
        let allDocs = [];

        for (const collName of collections) {
            const snap = await db.collection(collName)
                .where('issuerId', 'in', candidates)
                .orderBy('createdAt', 'desc')
                .limit(collName === 'fact_vectors' ? 800 : 1500)
                .get();
            allDocs = allDocs.concat(snap.docs);
        }

        // --- CHUNK SELECTION LOGIC (Simplified for Core Service) ---
        // (Copied from original logic but optimized for modularity)
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
                text,
                title,
                date,
                isAudited: isAuditedField,
                isFinancial
            };
        });

        // Robust Sort: Audited Financials first, then by date
        chunks.sort((a, b) => {
            if (a.isAudited !== b.isAudited) return a.isAudited ? -1 : 1;
            if (a.isFinancial !== b.isFinancial) return a.isFinancial ? -1 : 1;
            return new Date(b.date) - new Date(a.date);
        });

        // Limit chunks for context to avoid overloading AI but keeping high quality
        const selectedChunks = chunks.slice(0, 100);

        // Build Context
        const context = selectedChunks.map(c => `[${c.date}] ${c.title}: ${c.text.substring(0, 5000)}...`).join('\n\n');

        // --- PROMPT ENGINEERING ---
        const prompt = `
Eres un CFA Senior especializado en el mercado de valores de Nicaragua. 
Tu misión es extraer métricas financieras precisas para el emisor "${issuerName}" (ID: ${issuerId}) basándote EXCLUSIVAMENTE en el contexto proveído.

REGLAS DE EXTRACCIÓN:
1. NO CONVIERTAS MONEDAS. Extrae los valores tal cual aparecen.
2. Identifica si la moneda es NIO (Córdobas) o USD (Dólares). Si Activos > 1,200,000,000, asume NIO.
3. Prioriza Estados Financieros Auditados sobre reportes de calificación.
4. Si un dato no existe, deja nulo.

CONTEXTO:
${context.substring(0, 500000)}
`;

        const metrics = await callVertexAI(prompt, {
            temperature: 0,
            maxOutputTokens: 3000,
            model: AI_CONFIG.REASONING_MODEL,
            isJson: true,
            responseSchema: METRICS_EXTRACTION_SCHEMA
        });

        // --- POST PROCESSING (Normalization & Currency) ---
        // TODO: Extract to normalizationService.js
        const meta = metrics.metadata || {};
        const cap = metrics.capital || {};

        // Heuristic Recovery
        if (cap.activosTotales && cap.patrimonio && !cap.pasivos) {
            cap.pasivos = Number((cap.activosTotales - cap.patrimonio).toFixed(2));
        }

        // Currency Normalization
        const detectedCurrency = String(meta.moneda || '').toUpperCase();
        const isNIO = detectedCurrency.includes('NIO') || (cap.activosTotales > 1200000000);

        if (isNIO) {
            let RATE = 36.6243;
            try {
                const metaDoc = await db.collection('system').doc('market_metadata').get();
                if (metaDoc.exists && metaDoc.data().exchangeRate) RATE = metaDoc.data().exchangeRate;
            } catch (e) { }

            const convert = (val) => (val !== null && val !== undefined) ? Number((val / RATE).toFixed(2)) : null;
            if (cap.activosTotales) cap.activosTotales = convert(cap.activosTotales);
            // ... apply to other fields
            meta.moneda = 'USD';
        }

        // Store in Firestore
        const docRef = db.collection('issuerMetrics').doc(issuerId);
        const finalMetrics = {
            ...metrics,
            issuerId,
            sourceId: sourceId || issuerId,
            issuerName,
            extractedAt: new Date(),
            chunksAnalyzed: chunks.length,
        };

        await docRef.set(finalMetrics, { merge: true });

        if (meta.periodo) {
            const periodKey = meta.periodo.replace(/[^a-zA-Z0-9]/g, '_');
            await docRef.collection('snapshots').doc(periodKey).set({ ...finalMetrics, savedAt: new Date() });
        }

        return finalMetrics;

    } catch (error) {
        functions.logger.error(`Error extracting metrics for ${issuerName}:`, error);
        throw error;
    }
}

module.exports = { extractIssuerMetrics };
