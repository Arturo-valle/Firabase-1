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

    // Helper: Parse various date formats (ISO, DD/MM/YYYY, DD-MM-YYYY)
    const parseDate = (dateStr) => {
        if (!dateStr) return 0;
        // Try standard Date first (ISO)
        let d = new Date(dateStr);
        if (!isNaN(d.getTime())) return d.getTime();

        // Try DD/MM/YYYY or DD-MM-YYYY
        const match = dateStr.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
        if (match) {
            const day = parseInt(match[1]);
            const month = parseInt(match[2]) - 1; // JS months are 0-11
            const year = parseInt(match[3]);
            d = new Date(year, month, day);
            if (!isNaN(d.getTime())) return d.getTime();
        }
        return 0; // Fallback
    };

    // ID Mapping: input_id -> firestore_chunks_id
    const ID_MAPPING = {
        "agricorp": "corporaci-n-agricola",
        "banpro": "banpro",
        "bdf": "banco-de-finanzas",
        "fama": "fama",
        "fdl": "financiera-fdl",
        "fid": "fid-sociedad-an-nima",
        "horizonte": "horizonte-fondo-de-inversi-n-financiero-de-crecimiento-d-lares-no-diversificado"
    };

    // issuerId is the input (clean ID e.g. 'bdf')
    // targetId is the SOURCE (where chunks are e.g. 'banco-de-finanzas')
    const sourceId = ID_MAPPING[issuerId] || issuerId;

    try {
        // Get recent chunks for this issuer (using SOURCE ID)
        const chunksSnapshot = await db.collection('documentChunks')
            .where('issuerId', '==', sourceId)
            .orderBy('createdAt', 'desc')
            .limit(5000)
            .get();

        if (chunksSnapshot.empty) {
            functions.logger.warn(`No document chunks found for issuer ${issuerId}. Documents might not be processed yet.`);
            return { error: 'No processed documents found. Please trigger document processing first.' };
        }

        // Prioritize FINANCIAL_REPORT chunks
        const chunks = chunksSnapshot.docs.map(doc => {
            const data = doc.data();
            const md = data.metadata || {};
            const isFinancial = md.docType === 'FINANCIAL_REPORT' ||
                md.documentType === 'Estados Financieros' ||
                /financiero|balance|resultado|auditado/i.test(data.text);

            // Key Fix: Detect "Audited" status for priority boost
            // Many "Audited 2024" docs have date '2024-01-01', making them seem older than 'Dec 2024' rating reports.
            // We want to prioritize Audited (Full Year) over Rating Reports (Partial).
            const isAudited = /auditado|estados financieros|informe de los auditores/i.test(md.title || md.documentTitle || '') ||
                /informe de los auditores/i.test(data.text.substring(0, 1000));
            // Also allow Rating Reports, Prospectuses, and Relevant Facts to be "Financial" candidates
            const isRatingReport = /calificaci[oó]n|riesgo|rating/i.test(md.title || md.documentTitle || '');
            const isProspectus = /prospecto|informativo/i.test(md.title || md.documentTitle || '') || md.docType === 'PROSPECTUS';
            const isRelevantFact = /hecho relevante|relevante/i.test(md.title || md.documentTitle || '') || md.docType === 'RELEVANT_FACT';

            return {
                text: data.text,
                title: md.title || md.documentTitle, // Pass title for debugging
                isFinancial,
                isAudited,
                isRatingReport,
                isProspectus,
                isRelevantFact,
                date: md.documentDate || md.date,
                chunkIndex: data.chunkIndex
            };
        });

        // Sort chunks:
        // Score = Time + Boost. 
        // Boost Audited docs by ~5 years (1.57e11 ms) to ensure they beat "Today's Date" garbage and Rating Reports.
        chunks.sort((a, b) => {
            const timeA = parseDate(a.date);
            const timeB = parseDate(b.date);

            const boostA = a.isAudited ? 157700000000 : (a.isRatingReport ? 5000000000 : (a.isProspectus ? 2500000000 : 0));
            const boostB = b.isAudited ? 157700000000 : (b.isRatingReport ? 5000000000 : (b.isProspectus ? 2500000000 : 0));

            const scoreA = (timeA || 0) + boostA;
            const scoreB = (timeB || 0) + boostB;

            if (scoreA !== scoreB) return scoreB - scoreA; // Descending Score

            // Same score? Check relevance
            if (a.isFinancial !== b.isFinancial) return (b.isFinancial ? 1 : 0) - (a.isFinancial ? 1 : 0);

            // Same relevance? Keep reading order
            return (a.chunkIndex || 0) - (b.chunkIndex || 0);
        });

        // DEBUG: Log the top 5 chunks after sort
        functions.logger.info(`Top 5 Chunks for ${issuerName}:`);
        chunks.slice(0, 5).forEach((c, i) => {
            functions.logger.info(`[${i}] Date: ${c.date}, IsAudited: ${c.isAudited}, IsFinancial: ${c.isFinancial}, TextStart: ${c.text.substring(0, 50)}...`);
        });

        // Concatenate chunks for context
        // Increased limit to 500,000 to capture full financial statements
        // DIVERSITY LOGIC:
        // We want to avoid filling the context with 50 chunks from the same "Summary Rating Report".
        // Instead, we want to mix chunks from different relevant documents.
        const TARGET_CONTEXT_SIZE = 120; // Increased from 40 to 120 chunks (~50k tokens, well within Flash 1M limit)
        const MAX_CHUNKS_PER_DOC = 50;   // Increased from 10 to 50 to capture tables deep in Audit PDFs
        const selectedChunks = [];
        const chunksPerDoc = new Map();

        for (const chunk of chunks) {
            if (selectedChunks.length >= TARGET_CONTEXT_SIZE) break;

            const docKey = chunk.title || 'unknown';
            const currentCount = chunksPerDoc.get(docKey) || 0;

            if (currentCount < MAX_CHUNKS_PER_DOC) {
                selectedChunks.push(chunk);
                chunksPerDoc.set(docKey, currentCount + 1);
            }
        }

        const context = selectedChunks
            .map(c => {
                let dateStr = c.date || 'Fecha desconocida';

                // Hack: Fix misleading "Jan 1st" dates for Audited Annual Reports
                // If Audited and date is Jan 1st, it usually means "Fiscal Year X".
                // We should present it as "Dec 31st X" to show it's the LATEST data.
                if (c.isAudited && typeof dateStr === 'string' && dateStr.includes('-01-01')) {
                    // Try to extract year from text/title if available, or just use date year
                    const year = dateStr.split('-')[0];
                    dateStr = `${year}-12-31 (CIERRE FISCAL)`;
                }

                return `[${dateStr}] ${c.isAudited ? 'TIPO: AUDITADO' : (c.isFinancial ? 'TIPO: FINANCIERO' : 'TIPO: OTRO')}\n${c.text}`;
            })
            .join('\n\n')
            .slice(0, 500000);

        // EXTRA DEBUG: Find specific chunks to see why they failed
        const auditedChunk = chunks.find(c => (c.title || '').includes('AUDITADOS FDL 2024') || (c.text || '').includes('Informe de los auditores'));
        if (auditedChunk) {
            functions.logger.info('DEBUG AUDITED CHUNK:', {
                title: auditedChunk.title,
                date: auditedChunk.date,
                isAudited: auditedChunk.isAudited,
                isFinancial: auditedChunk.isFinancial,
                scoreBoost: auditedChunk.isAudited ? 39420000000 : 0
            });
        } else {
            functions.logger.info('DEBUG: Audited Chunk NOT FOUND in memory list. Total chunks:', chunks.length);
        }

        const rating2025Chunk = chunks.find(c => (c.text || '').includes('082025') || (c.date || '').includes('2025'));
        if (rating2025Chunk) {
            functions.logger.info('DEBUG RATING 2025 CHUNK:', JSON.stringify({
                date: rating2025Chunk.date,
                isAudited: rating2025Chunk.isAudited,
                isFinancial: rating2025Chunk.isFinancial
            }));
        }

        functions.logger.info(`CONTEXT PREVIEW (${issuerName}): ${context.substring(0, 500)}`);

        const prompt = `
Eres un analista financiero experto especializado en mercados emergentes(Nicaragua).
Tu tarea es extraer métricas financieras clave de los documentos proporcionados para el emisor "${issuerId}".

DOCUMENTOS DISPONIBLES(Contexto):
${context}

CONTEXTO Y REGLAS CRÍTICAS DE PRIORIZACIÓN:
        1. ** Diferencia entre "Período Financiero" y "Fecha de Reporte":**
            -   A menudo, el documento más reciente es un "Informe de Calificación"(ej.Marzo 2025) que NO contiene los estados financieros completos, sino que analiza datos pasados(ej.Dic 2024).
    -   ** SIEMPRE ** debes extraer las métricas de los ** ESTADOS FINANCIEROS AUDITADOS ** más recientes disponibles, aunque haya un informe de calificación más nuevo.
    - El campo "metadata.periodo" debe reflejar la fecha de CORTE de los estados financieros(ej. "Dic-2024"), NO la fecha del informe de calificación(ej. "Mar-2025").

2. ** Manejo de Datos Faltantes(N / D):**
    - Es mejor devolver datos de "Dic 2024" (auditados) que "N/D".
    - **EXCEPCIÓN CRÍTICA (SMART FALLBACK - Moodys / Fitch / SCR):**
        - Si NO existen "Estados Financieros Auditados" (como para BDF), **DEBES** extraer información de los "Informes de Calificación".
        - **IMPORTANTE:** Si no hay tablas claras, **BUSCA EN EL TEXTO NARRATIVO**.
            - Ej: "El pasivo del Banco alcanzó C$19,469 millones". -> Extrae 19469.
            - Ej: "El patrimonio fue de C$2,000 millones". -> Extrae 2000.
            - **CÁLCULO PERMITIDO:** Si tienes Pasivos y Patrimonio, CALCULA Activos Totales (Activos = Pasivos + Patrimonio).
        - En este caso, "metadata.fuente" debe indicar "Informe de Calificación".

3. ** Moneda:**
            -   Todas las cifras deben normalizarse a Millones(Córdobas o Dólares según la moneda funcional reportada).
    - Detecta la moneda: "Nio", "C$", "Córdobas" -> NIO. "Usd", "$", "Dólares" -> USD.
    - PREFERENCIA: Si el reporte menciona USD, extrae en USD.

EXTRAE EL SIGUIENTE OBJETO JSON(Sin markdown):
        {
            "liquidez": {
                "activoCorriente": number | null,
                    "pasivoCorriente": number | null,
                        "ratioCirculante": number | null(Calculado: Activo C. / Pasivo C.)
            },
            "eficiencia": {
                "rotacionActivos": number | null,
                "rotacionCartera": number | null
            },
            "solvencia": {
                "activoTotal": number | null,
                    "pasivoTotal": number | null,
                        "patrimonio": number | null,
                            "deudaPatrimonio": number | null(Calculado: Pasivo Total / Patrimonio)
            },
            "rentabilidad": {
                "ingresosTotales": number | null,
                "gastosFinancieros": number | null,
                "utilidadNeta": number | null,
                "roe": number | null,
                "roa": number | null
            },
            "calificacion": {
                "rating": "string" o null,
                    "perspectiva": "string" o null,
                        "fecha": "YYYY-MM" o null
            },
            "metadata": {
                "periodo": "YYYY" o "Sept 2024",
                "moneda": "USD" | "NIO",
                "simbolo_encontrado": "C$" | "$" | "US$" | "Córdobas" | "Dólares",
                "fuente": "Nombre del archivo o reporte utilizado"
            }
        }

REGLAS CRÍTICAS DE MONEDA:
- BUSCA EL SÍMBOLO EN LA TABLA: Si la tabla dice "Cifras en Miles de Córdobas", la moneda es "NIO". Si dice "Cifras en Miles de Dólares", es "USD".
- NO ASUMAS: Si ves "$", verifica si el reporte es local (a veces usan $ para córdobas en contextos informales, pero en estados financieros $ suele ser USD y C$ es NIO).
- ANTE LA DUDA entre 3,000 Millones de C$ o 3,000 Millones de $:
    - Bancos Grandes (Banpro, Lafise, BAC) -> Usualmente reportan en USD o C$ pero con cifras gigantes.
    - Revisa el encabezado de la columna.

REGLAS FINALES:
        - Si no encuentras un dato, usa null.NO inventes.
- Prioriza "Estados Financieros Auditados" sobre "Calificaciones de Riesgo" para los números brutos.`;

        const response = await callVertexAI(prompt, {
            temperature: 0, // Zero temperature for maximum determinism
            maxOutputTokens: 2000,
        });

        // Parse JSON response
        const match = response.match(/\{[\s\S]*\}/);
        if (match) {
            const metrics = JSON.parse(match[0]);

            // --- NORMALIZATION: Enforce Standard Structure ---
            // The prompt asks for 'solvencia', but logic expects 'capital'. Map them.
            if (!metrics.capital && metrics.solvencia) {
                metrics.capital = {
                    activosTotales: metrics.solvencia.activoTotal,
                    pasivos: metrics.solvencia.pasivoTotal,
                    patrimonio: metrics.solvencia.patrimonio
                };
            }
            // Ensure capital object exists
            if (!metrics.capital) metrics.capital = {};

            // --- HEURISTIC RECOVERY: Find misplaced metrics ---
            // Sometimes AI puts pasivos/patrimonio in 'rentabilidad' or 'solvencia' instead of 'capital'
            if (!metrics.capital.pasivos) {
                metrics.capital.pasivos = metrics.solvencia?.pasivoTotal || metrics.rentabilidad?.pasivos || null;
            }
            if (!metrics.capital.patrimonio) {
                metrics.capital.patrimonio = metrics.solvencia?.patrimonio || metrics.rentabilidad?.patrimonio || null;
            }
            if (!metrics.capital.activosTotales) {
                metrics.capital.activosTotales = metrics.solvencia?.activoTotal || metrics.rentabilidad?.activosTotales || null;
            }

            // --- CURRENCY NORMALIZATION LOGIC (Robust) ---
            const detectedCurrency = (metrics.metadata.moneda || '').toUpperCase();
            const symbol = (metrics.metadata.simbolo_encontrado || '').toUpperCase();

            // Default to USD if explicitly stated or inferred
            let isNIO = detectedCurrency === 'NIO' ||
                detectedCurrency === 'C$' ||
                detectedCurrency === 'CORDOBAS' ||
                symbol === 'C$' ||
                symbol.includes('CÓRDOBA');

            // Safety Net: Magnitude Check for Ambiguity
            // If AI says "USD" but assets are > 50,000 (Impossible for NI banks in USD Millions), force NIO.
            // Largest bank is ~4,000 M USD.
            if (metrics.capital && metrics.capital.activosTotales > 20000) {
                functions.logger.warn(`[Currency Guard] Value ${metrics.capital.activosTotales} is too high for USD. Forcing NIO interpretation.`);
                isNIO = true;
            }

            if (isNIO) {
                const RATE = 36.6243; // Standardize rate or fetch dynamic if possible
                functions.logger.info(`Converting NIO to USD for ${issuerName}. detected=${detectedCurrency}, symbol=${symbol}`);

                const convert = (val) => val ? Number((val / RATE).toFixed(2)) : null;

                if (metrics.capital) {
                    metrics.capital.activosTotales = convert(metrics.capital.activosTotales);
                    metrics.capital.pasivos = convert(metrics.capital.pasivos);
                    metrics.capital.patrimonio = convert(metrics.capital.patrimonio);
                }
                if (metrics.rentabilidad) {
                    metrics.rentabilidad.utilidadNeta = convert(metrics.rentabilidad.utilidadNeta);
                }
                if (metrics.liquidez) {
                    // Capital de trabajo is absolute
                    metrics.liquidez.capitalTrabajo = convert(metrics.liquidez.capitalTrabajo);
                    metrics.liquidez.activoCorriente = convert(metrics.liquidez.activoCorriente);
                    metrics.liquidez.pasivoCorriente = convert(metrics.liquidez.pasivoCorriente);
                }
                if (metrics.solvencia) {
                    metrics.solvencia.activoTotal = convert(metrics.solvencia.activoTotal);
                    metrics.solvencia.pasivoTotal = convert(metrics.solvencia.pasivoTotal);
                    metrics.solvencia.patrimonio = convert(metrics.solvencia.patrimonio);
                }
                if (metrics.rentabilidad) {
                    metrics.rentabilidad.ingresosTotales = convert(metrics.rentabilidad.ingresosTotales);
                    metrics.rentabilidad.gastosFinancieros = convert(metrics.rentabilidad.gastosFinancieros);
                }

                metrics.metadata.moneda = 'USD';
                metrics.metadata.nota = 'Converted from NIO (Rate 36.62)';
            } else {
                metrics.metadata.moneda = 'USD';
            }

            // Post-Processing: Calculate Missing Ratios using Absolute Values
            if (metrics.capital) {
                // Deuda Total = Pasivos
                const pasivos = metrics.capital.pasivos;
                let activos = metrics.capital.activosTotales;
                const patrimonio = metrics.capital.patrimonio;

                // Derived: Assets = Liabilities + Equity
                if ((!activos || activos === 0) && pasivos && patrimonio) {
                    activos = Number((pasivos + patrimonio).toFixed(2));
                    metrics.capital.activosTotales = activos;
                    if (metrics.solvencia) metrics.solvencia.activoTotal = activos;
                    functions.logger.info(`Derived Activos Totales from Pasivos + Patrimonio: ${activos}`);
                }

                if (pasivos && activos && activos > 0) {
                    // Calculate Debt/Assets if missing or weird (e.g. < 1 which implies 0.XX%)
                    if (!metrics.solvencia) metrics.solvencia = {};
                    if (!metrics.solvencia.deudaActivos || metrics.solvencia.deudaActivos < 1) {
                        // e.g. 0.84 -> 84.0
                        const calculated = (pasivos / activos) * 100;
                        metrics.solvencia.deudaActivos = Number(calculated.toFixed(2));
                        functions.logger.info(`Calculated missing / fixed Deuda / Activos for ${issuerName}: ${metrics.solvencia.deudaActivos}% `);
                    }
                }

                if (pasivos && patrimonio && patrimonio > 0) {
                    if (!metrics.solvencia) metrics.solvencia = {};
                    if (!metrics.solvencia.deudaPatrimonio) {
                        const calculated = pasivos / patrimonio;
                        metrics.solvencia.deudaPatrimonio = Number(calculated.toFixed(2));
                        functions.logger.info(`Calculated missing Deuda / Patrimonio for ${issuerName}: ${metrics.solvencia.deudaPatrimonio} x`);
                    }
                }

                // ROE/ROA Check and Net Income Correction
                if (metrics.rentabilidad) {
                    let utilidad = metrics.rentabilidad.utilidadNeta;
                    const roe = metrics.rentabilidad.roe;
                    const roa = metrics.rentabilidad.roa;

                    // 1. Calculate Implied Net Income from Ratios (High Confidence)
                    let impliedUtilidad = null;
                    if (roe && roe > 0 && patrimonio && patrimonio > 0) {
                        impliedUtilidad = (roe / 100) * patrimonio;
                    } else if (roa && roa > 0 && activos && activos > 0) {
                        impliedUtilidad = (roa / 100) * activos;
                    }

                    // 2. Validate extracted Utilidad vs Implied
                    if (impliedUtilidad !== null) {
                        // If Utilidad is missing, or deviates > 50% from implied (likely scale error), use Implied
                        if (!utilidad || Math.abs(utilidad - impliedUtilidad) / impliedUtilidad > 0.5) {
                            console.log(`[Correction] Utilidad Neta ${utilidad} seems wrong.Correcting to ${impliedUtilidad.toFixed(2)} based on ROE / ROA.`);
                            metrics.rentabilidad.utilidadNeta = Number(impliedUtilidad.toFixed(2));
                            utilidad = metrics.rentabilidad.utilidadNeta;
                            metrics.metadata.nota = (metrics.metadata.nota || '') + ' | Net Income Auto-Corrected';
                        }
                    }

                    // 3. Re-calculate Ratios if Utilidad is now trustworthy but Ratios were missing
                    if (utilidad) {
                        if (patrimonio && patrimonio > 0 && (!metrics.rentabilidad.roe || metrics.rentabilidad.roe < 1)) {
                            const newRoe = (utilidad / patrimonio) * 100;
                            metrics.rentabilidad.roe = Number(newRoe.toFixed(2));
                        }
                        if (activos && activos > 0 && (!metrics.rentabilidad.roa || metrics.rentabilidad.roa < 1)) {
                            const newRoa = (utilidad / activos) * 100;
                            metrics.rentabilidad.roa = Number(newRoa.toFixed(2));
                        }

                        // --- NEW: Calculate Missing Efficiency / Margin Ratios ---
                        if (metrics.rentabilidad) {
                            const utilidad = metrics.rentabilidad.utilidadNeta;
                            const ingresos = metrics.rentabilidad.ingresosTotales;
                            const activos = metrics.capital.activosTotales;

                            // Margen Neto (Utilidad / Ingresos)
                            if (utilidad && ingresos && ingresos > 0) {
                                if (!metrics.rentabilidad.margenNeto) { // Only if not extracted
                                    metrics.rentabilidad.margenNeto = Number(((utilidad / ingresos) * 100).toFixed(2));
                                    functions.logger.info(`Calculated Margen Neto for ${issuerName}: ${metrics.rentabilidad.margenNeto}%`);
                                }
                            }

                            // Rotación Activos (Ingresos / Activos)
                            if (ingresos && activos && activos > 0) {
                                // Assuming this belongs in 'eficiencia' or similar, but structure uses flattened rentabilidad/liquidez
                                // We will add it to rentabilidad or a new efficiency block if schema allows.
                                // Existing schema seems loose. Let's put it in rentabilidad (or solvencia implies efficiency sometimes).
                                // Actually, let's keep it simple. If the frontend expects 'eficiencia', we need to add that object.
                                // Prompt didn't ask for 'eficiencia', so we'll store it in rentabilidad for now or just calculated fields.

                                // Let's assume frontend checks 'metrics.eficiencia' or just expects these ratios.
                                // Looking at frontend code (ComparisonTable), it likely maps generic fields.
                                // Let's check where 'rotacionActivos' usually lives. 
                                // It usually lives in 'eficiencia'. Let's create it.
                                if (!metrics.eficiencia) metrics.eficiencia = {};
                                metrics.eficiencia.rotacionActivos = Number((ingresos / activos).toFixed(2));
                                functions.logger.info(`Calculated Rotación Activos for ${issuerName}: ${metrics.eficiencia.rotacionActivos}x`);
                            }
                        }

                        // --- NEW: Calculate Missing Liquidity Ratios ---
                        if (metrics.liquidez) {
                            const activeC = metrics.liquidez.activoCorriente;
                            const pasivoC = metrics.liquidez.pasivoCorriente;

                            if (activeC && pasivoC && pasivoC > 0) {
                                // Ratio Circulante
                                if (!metrics.liquidez.ratioCirculante) {
                                    metrics.liquidez.ratioCirculante = Number((activeC / pasivoC).toFixed(2));
                                }
                                // Capital Trabajo (Absolute)
                                if (!metrics.liquidez.capitalTrabajo) {
                                    metrics.liquidez.capitalTrabajo = Number((activeC - pasivoC).toFixed(2));
                                }
                            }
                        }
                    }
                }
            }

            // Store in Firestore using ISSUER ID (Clean ID)
            const docRef = db.collection('issuerMetrics').doc(issuerId);

            await docRef.set({
                ...metrics,
                issuerId: issuerId, // Save as CLEAN ID
                sourceId: sourceId, // Track source chunks ID
                issuerName,
                extractedAt: new Date(),
                chunksAnalyzed: chunksSnapshot.size,
            }, { merge: true });

            // ALSO Save to 'snapshots' subcollection for historical comparison
            // Key by Period (e.g., '2024', 'Sept_2024') + basic timestamp to allow multiple versions
            if (metrics.metadata && metrics.metadata.periodo) {
                const periodKey = metrics.metadata.periodo.replace(/[^a-zA-Z0-9]/g, '_');
                // We use set() with merge: true to update the existing period if it exists, 
                // effectively keeping the "latest version" of that period.
                await docRef.collection('snapshots').doc(periodKey).set({
                    ...metrics,
                    issuerId: issuerId,
                    savedAt: new Date()
                });
                functions.logger.info(`Snapshot saved for ${issuerName} period ${periodKey} `);
            }

            functions.logger.info(`Metrics extracted for ${issuerName}: `, metrics);
            return metrics;
        } else {
            throw new Error('Could not parse metrics from AI response');
        }
    } catch (error) {
        functions.logger.error(`Error extracting metrics for ${issuerName}: `, error);
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
 * Extract historical metrics time-series (Quarterly/Annual)
 */
async function extractHistoricalMetrics(issuerId, issuerName) {
    const db = getFirestore();

    try {
        // Retrieve chunks - prioritize FINANCIAL_REPORT types
        const chunksSnapshot = await db.collection('documentChunks')
            .where('issuerId', '==', issuerId)
            .orderBy('createdAt', 'desc')
            .limit(5000)
            .get();

        if (chunksSnapshot.empty) {
            functions.logger.warn(`No chunks found for ${issuerName} history extraction`);
            return null;
        }

        const chunks = chunksSnapshot.docs.map(doc => {
            const data = doc.data();
            const md = data.metadata || {};
            const isFinancial = md.docType === 'FINANCIAL_REPORT' ||
                md.documentType === 'Estados Financieros' ||
                /financiero|balance|resultado|auditado/i.test(data.text);
            return {
                text: data.text,
                isFinancial
            };
        });

        // Sort to put financial chunks first
        chunks.sort((a, b) => (b.isFinancial ? 1 : 0) - (a.isFinancial ? 1 : 0));

        const contextText = chunks.slice(0, 40).map(c => c.text).join('\n\n---\n\n');
        functions.logger.info(`Found ${chunks.length} chunks for ${issuerName}.Context length: ${contextText.length} `);

        const prompt = `
          You are a financial analyst for the Nicaraguan Stock Exchange.
          Analyze the following document excerpts from ${issuerName}.
          
          Your goal is to extract HISTORICAL execution data for the "Evolution" chart.
          Focus on finding Quarterly or Annual data points for:
            - Total Assets(Activos Totales)
                - Total Revenue(Ingresos Totales / Operativos)
                    - Net Income(Utilidad Neta)
                        - ROE(if available or calculable)
          
          Return a JSON ARRAY in plain text(no markdown formatting).Each object should represent a specific period(e.g., "Q3 2024", "2023").
          Sort by date(ascending).

            Format:
        [
            {
                "period": "Q3 2024",
                "date": "2024-09-30",
                "activosTotales": 12345678.90,
                "ingresosTotales": 567890.00,
                "utilidadNeta": 45600.00,
                "roe": 12.5,
                "patrimonio": 12345.67,
                "liquidez": 1.5,
                "fuente": "Estados Financieros Sept 2024"
            }
        ]
          
          Returns an EMPTY array[] if no clear historical data tables are found.

            DOCUMENTS:
          ${contextText}
        `;

        const response = await callVertexAI(prompt, {
            temperature: 0.1,
            maxOutputTokens: 2000, // Increased for history
        });

        functions.logger.info(`AI Response for ${issuerName} history: ${response.substring(0, 500)}...`);

        // Clean response of markdown
        let cleanResponse = response.replace(/```json/g, '').replace(/```/g, '').trim();

        // Handle "history": [...] wrapper if AI adds it
        if (cleanResponse.startsWith('{') && cleanResponse.includes('"history"')) {
            try {
                const parsed = JSON.parse(cleanResponse);
                if (parsed.history && Array.isArray(parsed.history)) {
                    cleanResponse = JSON.stringify(parsed.history);
                }
            } catch (e) { }
        }

        let history = [];
        try {
            history = JSON.parse(cleanResponse);
        } catch (e) {
            functions.logger.error(`Failed to parse history JSON for ${issuerName}:`, cleanResponse);
            return [];
        }

        if (!Array.isArray(history)) {
            functions.logger.warn(`AI returned non-array for ${issuerName}:`, history);
            return [];
        }

        functions.logger.info(`Extracted ${history.length} historical points for ${issuerName}`);
        if (history.length > 0) {
            const batch = db.batch();
            const historyRef = db.collection('issuerMetrics').doc(issuerId).collection('history');

            // Delete old history 
            const oldDocs = await historyRef.get();
            oldDocs.forEach(doc => batch.delete(doc.ref));

            history.forEach(item => {
                const docId = item.period ? item.period.replace(/[^a-zA-Z0-9]/g, '_') : 'period_' + Date.now();
                batch.set(historyRef.doc(docId), { ...item, extractedAt: new Date().toISOString() });
            });

            await batch.commit();
            functions.logger.info(`Saved ${history.length} historical points for ${issuerName}`);
            return history;
        }

        return [];

    } catch (error) {
        functions.logger.error(`Error extracting historical metrics for ${issuerName}:`, error);
        return [];
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
        functions.logger.error(`Error getting history for ${issuerId}: `, error);
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
