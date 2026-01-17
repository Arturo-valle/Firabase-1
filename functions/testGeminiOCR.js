const { getFirestore } = require('firebase-admin/firestore');
const admin = require('firebase-admin');
const axios = require('axios');
const { GoogleAuth } = require('google-auth-library');

async function testOCR() {
    console.log('🧪 Iniciando TEST de Gemini OCR REST...');

    if (admin.apps.length === 0) admin.initializeApp();

    const url = 'https://storage.googleapis.com/mvp-nic-market.firebasestorage.app/documents%2Fagricorp%2Frec_1767550479993_231024_AGRICORP_PROSPECTO_2024__PDF_.pdf';

    try {
        console.log('1. Descargando PDF...');
        const pdfResp = await axios.get(url, { responseType: 'arraybuffer' });
        const pdfBuffer = Buffer.from(pdfResp.data);
        console.log(`✅ PDF Descargado (${pdfBuffer.length} bytes)`);

        console.log('2. Obteniendo Token...');
        const auth = new GoogleAuth({
            scopes: 'https://www.googleapis.com/auth/cloud-platform'
        });
        const authClient = await auth.getClient();
        const accessToken = await authClient.getAccessToken();
        const token = accessToken.token;

        const project = 'mvp-nic-market';
        const location = 'us-central1';
        const model = 'gemini-1.5-flash';
        const apiUrl = `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/${model}:generateContent`;

        const payload = {
            contents: [{
                role: 'user',
                parts: [
                    { text: "Extrae todo el texto de este PDF. Resumen si es muy largo." },
                    {
                        inlineData: {
                            mimeType: 'application/pdf',
                            data: pdfBuffer.toString('base64')
                        }
                    }
                ]
            }],
            generationConfig: {
                maxOutputTokens: 2048, // Limitamos para el test
                temperature: 0
            }
        };

        console.log('3. Llamando a Gemini API (Vertex REST)...');
        const start = Date.now();
        const response = await axios.post(apiUrl, payload, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            timeout: 60000 // 60s timeout for test
        });

        const duration = (Date.now() - start) / 1000;
        console.log(`✅ Respuesta recibida en ${duration}s`);

        if (response.data.candidates) {
            const text = response.data.candidates[0].content.parts[0].text;
            console.log('--- TEXTO EXTRAÍDO (Primeros 200 chars) ---');
            console.log(text.substring(0, 200));
        } else {
            console.log('❌ No hay candidatos en la respuesta:', JSON.stringify(response.data));
        }

    } catch (e) {
        console.error('❌ ERROR:', e.response ? JSON.stringify(e.response.data) : e.message);
    }
}

testOCR();
