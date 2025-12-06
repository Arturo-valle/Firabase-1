const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp({
    projectId: 'mvp-nic-market',
});

async function triggerProcessing() {
    try {
        console.log('🚀 Iniciando procesamiento de documentos...');
        console.log('⏰ Esto puede tomar 30-60 minutos.');
        console.log('💰 Costo estimado: $5-10 USD en Vertex AI');
        console.log('');

        // Call the function directly using the Functions API
        const https = require('https');
        const options = {
            hostname: 'us-central1-mvp-nic-market.cloudfunctions.net',
            port: 443,
            path: '/processDocumentsManual',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        };

        const req = https.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                console.log('✅ Procesamiento iniciado!');
                console.log('Respuesta:', data);
                console.log('');
                console.log('📊 Puedes monitorear el progreso en:');
                console.log('https://console.firebase.google.com/project/mvp-nic-market/functions/logs');
            });
        });

        req.on('error', (error) => {
            console.error('❌ Error:', error);
        });

        req.end();

    } catch (error) {
        console.error('❌ Error al iniciar procesamiento:', error);
    }
}

triggerProcessing();
