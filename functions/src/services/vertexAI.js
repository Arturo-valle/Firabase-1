const { VertexAI } = require('@google-cloud/vertexai');
const axios = require('axios');
const functions = require('firebase-functions');

// Initialize Vertex AI client
const project = 'mvp-nic-market';
const location = 'us-central1';

const vertexAI = new VertexAI({ project, location });

/**
 * Genera embeddings para un texto usando Vertex AI REST API
 * @param {string} text - Texto para generar embeddings
 * @returns {Promise<number[]>} Vector de embeddings
 */
async function generateEmbeddings(text) {
    try {
        // Lazy initialization to avoid blocking module load
        const { GoogleAuth } = require('google-auth-library');
        const auth = new GoogleAuth({
            scopes: 'https://www.googleapis.com/auth/cloud-platform'
        });
        const client = await auth.getClient();
        const accessToken = await client.getAccessToken();
        const token = accessToken.token;

        const projectId = 'mvp-nic-market';
        const location = 'us-central1';
        const modelId = 'text-embedding-004';

        const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${modelId}:predict`;

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
        if (error.response) {
            functions.logger.error('Response data:', JSON.stringify(error.response.data));
        }
        throw new Error(`Failed to generate embeddings: ${error.message}`);
    }
}

/**
 * Genera análisis financiero usando Gemini Pro
 * @param {string} prompt - Prompt con contexto y pregunta
 * @param {object} options - Opciones de generación
 * @returns {Promise<string>} Respuesta generada
 */
async function generateFinancialAnalysis(prompt, options = {}) {
    try {
        const { VertexAI } = require('@google-cloud/vertexai');
        const vertexAI = new VertexAI({
            project: 'mvp-nic-market',
            location: 'us-central1',
        });

        const MODEL_NAME = 'gemini-2.5-flash-lite';
        const generativeModel = vertexAI.preview.getGenerativeModel({
            model: MODEL_NAME,
            generationConfig: {
                maxOutputTokens: options.maxTokens || 2048,
                temperature: options.temperature || 0.2,
                topP: options.topP || 0.8,
                topK: options.topK || 40,
            },
        });

        const request = {
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
        };

        const result = await generativeModel.generateContent(request);
        const response = result.response;

        return response.candidates[0].content.parts[0].text;
    } catch (error) {
        functions.logger.error('Error generating analysis:', error);
        throw new Error(`Failed to generate analysis: ${error.message}`);
    }
}

/**
 * Calcula similitud coseno entre dos vectores
 * @param {number[]} vectorA 
 * @param {number[]} vectorB 
 * @returns {number} Similitud entre 0 y 1
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

Tus herramientas:
- Documentos proporcionados:
${documents.map(d => `- ${d.title} (${d.date}): ${d.excerpt}`).join('\n')}

Tu tarea es generar un análisis de calificación crediticia siguiendo este proceso de pensamiento (Chain of Thought):

1.  **Recopilación de Evidencia**: Identifica menciones explícitas de calificaciones (SCR, Fitch, etc.) y sus fechas.
2.  **Análisis de Tendencia**: Determina si la calificación ha mejorado, empeorado o se mantiene estable.
3.  **Identificación de Drivers**: ¿Qué factores específicos (liquidez, entorno macro, gestión) causaron el cambio o la estabilidad?
4.  **Síntesis**: Redacta el informe final.

Salida esperada (Markdown):
## Análisis de Calificación Crediticia: ${issuerName}

### Resumen Ejecutivo
[Resumen de 2 líneas sobre la situación actual]

### Evolución de la Calificación
| Fecha | Calificadora | Nota | Perspectiva |
|-------|--------------|------|-------------|
| ...   | ...          | ...  | ...         |

### Factores Clave (Drivers)
- **Fortalezas**: ...
- **Debilidades**: ...

### Opinión del Analista
[Tu conclusión profesional sobre la solvencia del emisor]
`,

    comparativeAnalysis: (issuerNames, documents) => `
Eres un estratega de inversiones comparando oportunidades en el mercado de valores de Nicaragua.
Emisores a comparar: ${Array.isArray(issuerNames) ? issuerNames.join(', ') : issuerNames}.

Documentos base:
${documents.map(d => `- [${d.issuer}] ${d.title} (${d.date}): ${d.excerpt}`).join('\n')}

Proceso de Pensamiento (CoT):
1.  **Normalización de Datos**: Identifica métricas comparables (ROE, ROA, Nivel de Endeudamiento) en los textos. Si faltan datos para alguno, anótalo.
2.  **Evaluación Relativa**: No solo listes datos, *compara*. ¿Quién es más eficiente? ¿Quién está más apalancado?
3.  **Análisis de Riesgo vs Retorno**: ¿El desempeño superior de uno justifica un mayor riesgo?
4.  **Veredicto**: ¿Cuál es la mejor opción de inversión conservadora y cuál para crecimiento?

Salida (Markdown):
## Reporte Comparativo de Inversión

### Tabla de Indicadores Clave
| Indicador | ${issuerNames.join(' | ')} |
|-----------|${issuerNames.map(() => '---').join('|')}|
| ROE | ... | ... |
| Endeudamiento | ... | ... |
| Liquidez | ... | ... |

### Análisis Cruzado
- **Eficiencia**: [Comparación directa]
- **Solvencia**: [Comparación directa]

### Veredicto del Estratega
- **Mejor para Conservadores**: [Emisor] porque...
- **Mejor para Crecimiento**: [Emisor] porque...
`,

    executiveSummary: (issuerName, documents) => `
Eres un Asesor Financiero de Banca Privada preparando un "One-Pager" para un cliente de alto patrimonio.
Objetivo: Dar una visión clara, honesta y accionable sobre **${issuerName}**.

Documentos recientes:
${documents.map(d => `- ${d.title} (${d.date}): ${d.excerpt}`).join('\n')}

Proceso de Pensamiento:
1.  **Detección de Señales**: Busca palabras clave de sentimiento (crecimiento, pérdida, riesgo, estable, desafío).
2.  **Extracción de "Hard Data"**: Busca los 3 números más impactantes (Utilidad Neta, Activos Totales, Mora).
3.  **Evaluación de Confianza**: ¿Qué tan recientes son los datos? (Si son de hace >1 año, baja la confianza).
4.  **Construcción de Narrativa**: Une los puntos para contar la historia financiera actual.

Formato JSON Estricto:
{
  "insight": "Narrativa de 2-3 oraciones. Empieza con la conclusión más fuerte. Ej: 'Banpro mantiene su liderazgo con un crecimiento sólido del 15%, aunque enfrenta desafíos en...'",
  "sentiment": "positive|neutral|negative",
  "confidence": 0.XX, (0.0 a 1.0, penaliza si los documentos son viejos)
  "metrics": ["Etiqueta: Valor", "Etiqueta: Valor"],
  "citations": [
    {"text": "Afirmación específica", "source": "Título del documento", "relevance": "high"}
  ]
}
`,

    generalQuery: (query, context) => `
Eres un analista financiero senior especializado en el mercado de valores de Nicaragua.
Tu objetivo es responder con la precisión y rigurosidad de un reporte de Bloomberg Intelligence.

Contexto (Fragmentos de documentos oficiales):
${context}

Pregunta del Usuario: "${query}"

INSTRUCCIONES CRÍTICAS:
1. **SOLO usa datos del contexto proporcionado**. NO inventes cifras ni porcentajes.
2. **Cita fechas específicas** cuando menciones datos (ej: "según el informe de 2023...").
3. **Si no hay datos en el contexto**, indica claramente: "Los documentos disponibles no contienen información sobre [tema]."
4. **Usa formato estructurado**: encabezados, listas, tablas markdown cuando sea apropiado.
5. **Incluye montos exactos** cuando estén disponibles (ej: C$ 175,127,432, no "aproximadamente 175 millones").

Proceso de Análisis:
1. Identifica qué datos específicos tiene el contexto para responder.
2. Extrae cifras, fechas y fuentes exactas.
3. Estructura la respuesta de forma clara y profesional.
4. Si hay limitaciones en los datos, indícalas honestamente.

Respuesta (Markdown):
`
};

module.exports = {
    generateEmbeddings,
    generateFinancialAnalysis,
    cosineSimilarity,
    FINANCIAL_PROMPTS,
};
