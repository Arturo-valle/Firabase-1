const { GoogleGenAI } = require('@google/genai');
const axios = require('axios');
const functions = require('firebase-functions');

// Configuración para el proyecto
const PROJECT_ID = process.env.GCLOUD_PROJECT || 'mvp-nic-market';
const LOCATION = 'global';

/**
 * Configuración centralizada de modelos para estrategia híbrida
 */
const AI_CONFIG = {
    // El "Cerebro Premium" para análisis complejos (Razonamiento)
    REASONING_MODEL: 'gemini-2.0-flash-exp',

    // El "Obrero Rápido" para tareas mecánicas (OCR, resúmenes simples)
    FAST_MODEL: 'gemini-2.0-flash-exp',

    // Modelo de Embeddings (¡No cambiar sin re-indexar la base de datos!)
    EMBEDDING_MODEL: 'text-embedding-004'
};


/**
 * Cliente de Google Gen AI configurado para Vertex AI
 * Nota: El SDK maneja la autenticación automáticamente en el entorno de Cloud Functions
 */
const client = new GoogleGenAI({
    vertexai: true,
    project: PROJECT_ID,
    location: LOCATION
});


/**
 * Genera embeddings para un texto usando Vertex AI REST API
 * @param {string} text - Texto para generar embeddings
 * @returns {Promise<number[]>} Vector de embeddings
 */
async function generateEmbeddings(text) {
    try {
        const { GoogleAuth } = require('google-auth-library');
        const auth = new GoogleAuth({
            scopes: 'https://www.googleapis.com/auth/cloud-platform'
        });
        const authClient = await auth.getClient();
        const accessToken = await authClient.getAccessToken();
        const token = accessToken.token;

        const modelId = AI_CONFIG.EMBEDDING_MODEL;
        // Los embeddings se mantienen en us-central1 ya que son estables ahí
        const embLocation = 'us-central1';
        const url = `https://${embLocation}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${embLocation}/publishers/google/models/${modelId}:predict`;

        const response = await axios.post(url, {
            instances: [{ content: text }]
        }, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.data.predictions || !response.data.predictions[0].embeddings) {
            throw new Error('No embeddings in response');
        }

        return response.data.predictions[0].embeddings.values;
    } catch (error) {
        functions.logger.error('Error generating embeddings:', error.message);
        throw new Error(`Failed to generate embeddings: ${error.message}`);
    }
}

/**
 * Genera análisis financiero usando el nuevo SDK @google/genai con soporte para Esquemas Estructurados
 * @param {string} prompt - Prompt con contexto y pregunta
 * @param {object} options - Opciones de generación (isJson, responseSchema)
 * @returns {Promise<string|object>} Respuesta generada (texto o JSON parseado)
 */
async function generateFinancialAnalysis(prompt, options = {}) {
    try {
        const MODEL_NAME = AI_CONFIG.REASONING_MODEL;

        const config = {
            maxOutputTokens: options.maxOutputTokens || options.maxTokens || 8192,
            temperature: options.temperature !== undefined ? options.temperature : 0,
            topP: options.topP || 0.95,
            topK: options.topK || 40,
        };

        // Support for Structured Output (JSON Schema)
        if (options.responseSchema) {
            config.responseMimeType = "application/json";
            config.responseSchema = options.responseSchema;
        } else if (options.isJson) {
            config.responseMimeType = "application/json";
        }

        const response = await client.models.generateContent({
            model: MODEL_NAME,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: config
        });

        if (!response || !response.text) {
            throw new Error(`Empty response from ${MODEL_NAME}`);
        }

        let text = response.text.trim();

        // If a schema was provided, we expect valid JSON already
        if (options.responseSchema) {
            try {
                return JSON.parse(text);
            } catch (e) {
                functions.logger.error("Failed to parse Structured Output JSON", { text, error: e.message });
                // Fallback to manual cleaning if it's slightly malformed
            }
        }

        // 1. Limpieza básica de bloques de código
        text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

        if (!options.isJson && !options.responseSchema) {
            return text;
        }

        // Si ES JSON, aplicamos limpieza agresiva para asegurar que pase JSON.parse
        const firstBrace = text.indexOf('{');
        const lastBrace = text.lastIndexOf('}');
        const firstArray = text.indexOf('[');
        const lastArray = text.lastIndexOf(']');

        let jsonPart = text;
        if (firstBrace !== -1 && lastBrace !== -1 && (firstArray === -1 || firstBrace < firstArray)) {
            jsonPart = text.substring(firstBrace, lastBrace + 1);
        } else if (firstArray !== -1 && lastArray !== -1) {
            jsonPart = text.substring(firstArray, lastArray + 1);
        }

        // Limpiar comentarios y caracteres de control
        jsonPart = jsonPart.replace(/\/\/.*$/gm, '')
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/[\u0000-\u001F\u007F-\u009F]/g, "");

        // Sanear valores numéricos con unidades pegadas
        jsonPart = jsonPart.replace(/:\s*(-?\$?\d+\.?\d*)\s*[%\$a-zA-Z]+/g, ': $1');

        // Corregir comas finales
        jsonPart = jsonPart.replace(/,(\s*[\]}])/g, '$1');

        return JSON.parse(jsonPart);
    } catch (error) {
        functions.logger.error(`Error generating analysis with ${MODEL_NAME}:`, error);
        throw new Error(`Failed to generate analysis: ${error.message}`);
    }
}




/**
 * Calcula similitud coseno entre dos vectores
 */
function cosineSimilarity(vectorA, vectorB) {
    if (vectorA.length !== vectorB.length) {
        throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vectorA.length; i++) {
        dotProduct += vectorA[i] * vectorB[i];
        normA += vectorA[i] * vectorA[i];
        normB += vectorB[i] * vectorB[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Prompts especializados para análisis financiero
 */
const FINANCIAL_PROMPTS = {
    creditRating: (issuerName, documents) => `
Eres un analista de riesgo crediticio senior (CFA Charterholder) evaluando a ${issuerName}.

Documentos proporcionados:
${documents.map(d => `- ${d.title} (${d.date}): ${d.excerpt}`).join('\n')}

Tu tarea es generar un análisis de calificación crediticia detallado.
Salida esperada (Markdown):
## Análisis de Calificación Crediticia: ${issuerName}
### Resumen Ejecutivo
### Evolución de la Calificación
### Factores Clave (Drivers)
### Opinión del Analista
`,

    comparativeAnalysis: (issuerNames, documents) => `
Eres un estratega de inversiones comparando oportunidades en el mercado de valores de Nicaragua.
Emisores a comparar: ${Array.isArray(issuerNames) ? issuerNames.join(', ') : issuerNames}.

Documentos base:
${documents.map(d => `- [${d.issuer}] ${d.title} (${d.date}): ${d.excerpt}`).join('\n')}

Salida (Markdown):
## Reporte Comparativo de Inversión
### Tabla de Indicadores Clave
### Análisis Cruzado
### Veredicto del Estratega
`,

    executiveSummary: (issuerName, documents) => `
Eres un Asesor Financiero de Banca Privada preparando un "One-Pager" para un cliente de alto patrimonio sobre **${issuerName}**.

Documentos recientes:
${documents.map(d => `- ${d.title} (${d.date}): ${d.excerpt}`).join('\n')}

Retorna un JSON estricto:
{
  "insight": "Narrativa de 2-3 oraciones",
  "sentiment": "positive|neutral|negative",
  "confidence": 0.XX,
  "metrics": ["Etiqueta: Valor"],
  "citations": [{"text": "...", "source": "...", "relevance": "high"}]
}
`,

    generalQuery: (query, context) => `
Eres un Analista Financiero Senior con acceso a la base documental del mercado de valores de Nicaragua.

Contexto de documentos (2020-2024):
${context}

Pregunta del usuario: "${query}"

Instrucciones Críticas:
1. **Citación Obligatoria**: Por cada dato numérico o afirmación clave, indica el documento y el año (ej: [Informe Anual 2022]).
2. **Estructura Temporal**: Si la pregunta implica evolución en el tiempo, usa una tabla Markdown para comparar los años disponibles (2020-2024).
3. **Integridad de Datos**: Si un dato no está en el contexto, indícalo explícitamente. No alucines con cifras fuera de los documentos proporcionados.
4. **Tono**: Profesional, analítico y directo.
`
};

module.exports = {
    generateEmbeddings,
    generateFinancialAnalysis,
    cosineSimilarity,
    FINANCIAL_PROMPTS,
    AI_CONFIG
};

