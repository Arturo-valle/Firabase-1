/**
 * AI Output Schemas for Gemini Structured Output
 */

const RAG_RESPONSE_SCHEMA = {
    type: "object",
    properties: {
        answer: { type: "string", description: "Narrative answer in Markdown" },
        structuredData: {
            type: "object",
            properties: {
                creditRating: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            date: { type: "string" },
                            rating: { type: "string" },
                            numericValue: { type: "number" }
                        },
                        required: ["date", "rating", "numericValue"]
                    }
                },
                ratios: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            name: { type: "string" },
                            value: { type: "number" },
                            date: { type: "string" }
                        },
                        required: ["name", "value"]
                    }
                },
                riskScores: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            category: { type: "string" },
                            score: { type: "number" }
                        },
                        required: ["category", "score"]
                    }
                },
                comparative: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            issuerName: { type: "string" },
                            metrics: {
                                type: "object",
                                additionalProperties: { type: "number" }
                            }
                        },
                        required: ["issuerName", "metrics"]
                    }
                }
            }
        },
        suggestedQueries: {
            type: "array",
            items: { type: "string" }
        }
    },
    required: ["answer"]
};

const METRICS_EXTRACTION_SCHEMA = {
    type: "object",
    properties: {
        capital: {
            type: "object",
            properties: {
                activosTotales: { type: "number" },
                pasivos: { type: "number" },
                patrimonio: { type: "number" }
            }
        },
        liquidez: {
            type: "object",
            properties: {
                activoCorriente: { type: "number" },
                pasivoCorriente: { type: "number" },
                ratioCirculante: { type: "number" },
                pruebaAcida: { type: "number" },
                capitalTrabajo: { type: "number" },
                inventarios: { type: "number" }
            }
        },
        solvencia: {
            type: "object",
            properties: {
                deudaActivos: { type: "number" },
                deudaPatrimonio: { type: "number" },
                coberturIntereses: { type: "number" },
                gastosFinancieros: { type: "number" },
                ebit: { type: "number" }
            }
        },
        rentabilidad: {
            type: "object",
            properties: {
                ingresosTotales: { type: "number" },
                utilidadNeta: { type: "number" },
                roe: { type: "number" },
                roa: { type: "number" },
                margenNeto: { type: "number" }
            }
        },
        eficiencia: {
            type: "object",
            properties: {
                rotacionActivos: { type: "number" },
                rotacionCartera: { type: "number" },
                morosidad: { type: "number" }
            }
        },
        calificacion: {
            type: "object",
            properties: {
                rating: { type: "string" },
                perspectiva: { type: "string" },
                fecha: { type: "string" }
            }
        },
        metadata: {
            type: "object",
            properties: {
                periodo: { type: "string" },
                moneda: { type: "string" },
                simbolo_encontrado: { type: "string" },
                fuente: { type: "string" },
                razonamiento_inferencia: { type: "string" }
            }
        }
    },
    required: ["capital", "rentabilidad", "metadata"]
};

const HISTORICAL_METRICS_SCHEMA = {
    type: "array",
    items: {
        type: "object",
        properties: {
            period: { type: "string", description: "Year (e.g. '2023')" },
            activosTotales: { type: "number" },
            utilidadNeta: { type: "number" },
            patrimonio: { type: "number" },
            moneda: { type: "string" },
            fuente: { type: "string" },
            esEstimado: { type: "boolean" },
            razonamiento: { type: "string" }
        },
        required: ["period", "activosTotales"]
    }
};

module.exports = {
    RAG_RESPONSE_SCHEMA,
    METRICS_EXTRACTION_SCHEMA,
    HISTORICAL_METRICS_SCHEMA
};
