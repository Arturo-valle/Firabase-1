const admin = require('firebase-admin');
const { generateFinancialAnalysis: callVertexAI, AI_CONFIG } = require('../functions/src/services/vertexAI');
const { HISTORICAL_METRICS_SCHEMA } = require('../functions/src/services/aiSchemas');
const { WHITELIST, EXTRACTION_MAPPING } = require('../functions/src/utils/issuerConfig');

// FORCE PROD
process.env.GCLOUD_PROJECT = 'mvp-nic-market';
delete process.env.FIRESTORE_EMULATOR_HOST;

if (!admin.apps.length) {
    admin.initializeApp({
        projectId: "mvp-nic-market"
    });
}

const db = admin.firestore();

async function run() {
    console.log("🚀 Starting ROBUST Local History Extraction...");

    // 1. Verify Connection
    try {
        const testDoc = await db.collection('issuers').doc('agricorp').get();
        if (!testDoc.exists) {
            console.error("❌ CONNECTIVITY CHECK FAILED: Valid issuer 'agricorp' not found. Check auth/project.");
            process.exit(1);
        }
        console.log(`✅ Connected to ${process.env.GCLOUD_PROJECT}. Found Agricorp.`);
    } catch (e) {
        console.error("❌ CONNECTION ERROR:", e);
        process.exit(1);
    }

    const ISSUERS_TO_PROCESS = ['agricorp'];


    for (const issuerId of ISSUERS_TO_PROCESS) {
        console.log(`\n--- Processing ${issuerId} ---`);
        try {
            // Find Source Mapping
            const candidates = EXTRACTION_MAPPING[issuerId] || [issuerId];

            // Find Docs
            const collections = ['documentChunks', 'fact_vectors'];
            let allDocs = [];
            for (const collName of collections) {
                const snap = await db.collection(collName)
                    .where('issuerId', 'in', candidates)
                    .limit(collName === 'fact_vectors' ? 1000 : 1000)
                    .get();
                allDocs = allDocs.concat(snap.docs);
            }

            if (allDocs.length === 0) {
                console.warn(`⚠️ No docs found for ${issuerId}`);
                continue;
            }

            // Mapping and Prioritization
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

            // Sort/Filter logic adjustment
            const relevantYearChunks = chunks.filter(c => {
                const y = new Date(c.date).getFullYear();
                return y >= 2023 || isNaN(y); // Focus on 2023+
            });

            // Priority: Keywords like "Situación Financiera", "Resultados", "Activos Totales"
            const scoreChunk = (c) => {
                let score = 0;
                const t = (c.text || '').toLowerCase();
                const title = (c.title || '').toLowerCase();

                if (t.includes('situación financiera') || t.includes('balance general')) score += 50;
                if (t.includes('estado de resultados')) score += 40;
                if (t.includes('activos totales') || t.includes('total activos')) score += 30;
                if (t.includes('utilidad neta') || t.includes('resultado neto')) score += 30;
                if (t.includes('comparativo') || t.includes('31 de diciembre')) score += 20;
                if (title.includes('auditado')) score += 20;
                if (title.includes('2024')) score += 10;

                return score;
            };

            const useChunks = (relevantYearChunks.length > 5 ? relevantYearChunks : chunks)
                .sort((a, b) => scoreChunk(b) - scoreChunk(a));

            const selectedChunks = useChunks.slice(0, 50); // Less but Higher quality
            const context = selectedChunks.map(c => `\n---\nDOCUMENTO: ${c.title} | FECHA: ${c.date}\nCONTENIDO: ${c.text}`).join('\n').slice(0, 800000);

            console.log(`Analyzing ${selectedChunks.length} HIGH QUALITY chunks (Focusing on BSheet/Results)...`);

            const prompt = `
Eres un analista financiero CFA experto en Nicaragua. Extrae el historial financiero de "${issuerId}" para 2021-2025 de estos chunks.

Extraer datos EXCLUSIVAMENTE para 2021, 2022, 2023, 2024, y 2025. IGNORA años anteriores.
Busca en los cuadros de Balance General y Estado de Resultados.

${context}

JSON FORMAT:
[
  { "period": "2024", "activosTotales": 12345, "utilidadNeta": 543, "patrimonio": 321 },
  ...
]
REGLA: Si las cifras están en "Miles de Córdobas", multiplícalas por 1000.
CONVERSIÓN: Devuelve el valor numérico en NIO si es posible. El script se encargará de pasarlo a USD.
`;

            const history = await callVertexAI(prompt, {
                temperature: 0,
                model: AI_CONFIG.REASONING_MODEL,
                responseSchema: HISTORICAL_METRICS_SCHEMA
            });

            console.log("Raw AI Response Object:", JSON.stringify(history, null, 2));

            let data = history;
            // Handle if the service returns the text string directly (depends on mock/implementation)
            if (typeof history === 'string') {
                const clean = history.replace(/```json/g, '').replace(/```/g, '').trim();
                try {
                    data = JSON.parse(clean);
                } catch (e) {
                    console.error("FAILED TO PARSE JSON. RAW TEXT:", history);
                    throw new Error("JSON Parse Error");
                }
            } else if (history.response) { // Sometimes wrapped
                data = history.response;
            }

            // Ensure array
            if (!Array.isArray(data)) {
                // Try to find array in keys
                const keys = Object.keys(data);
                for (const k of keys) {
                    if (Array.isArray(data[k])) {
                        data = data[k];
                        break;
                    }
                }
            }

            if (!Array.isArray(data)) {
                console.error("Structure is not an array:", data);
                // Last ditch: if it's a single object, wrap it
                if (data.period || data.year) data = [data];
                else throw new Error("Invalid structure returned by AI");
            }

            console.log("Parsed Data Points:", data && Array.isArray(data) ? data.length : "Unknown");

            const historyData = data;
            let RATE = 36.62;
            const convert = (val) => {
                if (val === null || val === undefined) return null;
                let s = String(val).trim();
                let isNegative = s.startsWith('(') && s.endsWith(')');
                let num = Number(s.replace(/[^0-9.-]/g, ''));
                if (isNegative) num = -Math.abs(num);
                if (isNaN(num)) return null;
                // Agricorp Assets are ~5B NIO (~140M USD). 
                // Any value > 300M is likely NIO and should be converted.
                if (num > 300000000) return Number((num / RATE).toFixed(2));
                return num;
            };

            const aggregatedData = {};

            for (const point of history) {
                console.log("Processing point:", point);
                const period = point.period || String(point.year);
                if (!period) continue;

                if (!aggregatedData[period]) aggregatedData[period] = { period: String(period) };

                // DEEP SEARCH HELPER (Double Pass Exact -> Partial)
                const findValue = (obj, keywords) => {
                    if (!obj) return null;
                    const clean = (s) => s.toLowerCase().replace(/[^a-z]/g, '');
                    const cleanKeywords = keywords.map(clean);

                    // PASS 1: Exact matches
                    for (const k of Object.keys(obj)) {
                        const ck = clean(k);
                        if (cleanKeywords.includes(ck)) {
                            if (typeof obj[k] !== 'object') return obj[k];
                        }
                    }
                    // PASS 2: Partial matches (only if not found)
                    for (const k of Object.keys(obj)) {
                        const ck = clean(k);
                        if (cleanKeywords.some(kw => ck.includes(kw) || kw.includes(ck))) {
                            if (typeof obj[k] !== 'object') return obj[k];
                        }
                    }
                    // PASS 3: Recursive
                    for (const k of Object.keys(obj)) {
                        if (typeof obj[k] === 'object' && obj[k] !== null) {
                            const found = findValue(obj[k], keywords);
                            if (found !== null) return found;
                        }
                    }
                    return null;
                };

                const activos = findValue(point, ['totalActivos', 'totalActivo', 'total_activos']);
                const utilidad = findValue(point, ['utilidadNetaDelAno', 'utilidadNeta', 'resultadoNeto', 'gananciaNeta', 'perdidaNeta']);
                const patrimonio = findValue(point, ['totalPatrimonio', 'patrimonioTotal', 'capitalContableTotal']);

                if (activos !== null) aggregatedData[period].activosTotales = convert(activos);
                if (utilidad !== null) aggregatedData[period].utilidadNeta = convert(utilidad);
                if (patrimonio !== null) aggregatedData[period].patrimonio = convert(patrimonio);
            }

            const batch = db.batch();
            for (const period in aggregatedData) {
                const finalPoint = {
                    ...aggregatedData[period],
                    extractedAt: new Date()
                };
                const ref = db.collection('issuerMetrics').doc(issuerId).collection('history').doc(String(period));
                batch.set(ref, finalPoint, { merge: true });
                console.log(`Saved ${period} -> Activos: ${finalPoint.activosTotales} | Utilidad: ${finalPoint.utilidadNeta}`);
            }

            await batch.commit();
            console.log(`✅ COMMITTED ${issuerId} to DB.`);


        } catch (e) {
            console.error(`❌ Error for ${issuerId}:`, e.message);
        }

        // Wait to avoid quota limits
        await new Promise(r => setTimeout(r, 2000));
    }
    console.log("\nDone.");
    process.exit(0);
}

run();
