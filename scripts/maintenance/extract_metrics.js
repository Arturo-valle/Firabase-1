const https = require('https');

const API_HOST = 'us-central1-mvp-nic-market.cloudfunctions.net';
const API_BASE_PATH = '/api';

function makeRequest(path, method = 'POST', body = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: API_HOST,
            path: `${API_BASE_PATH}${path}`,
            method: method,
            headers: { 'Content-Type': 'application/json' },
            timeout: 600000, // 10 minutes
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve({ status: res.statusCode, data: json });
                } catch (e) {
                    resolve({ status: res.statusCode, data: { raw: data } });
                }
            });
        });

        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

async function extractAllMetrics() {
    console.log('╔' + '═'.repeat(78) + '╗');
    console.log('║' + ' '.repeat(78) + '║');
    console.log('║' + '    🎯 METRICS EXTRACTION - Extract Financial Data from Processed Docs'.padEnd(78) + '║');
    console.log('║' + '    CentraCapital Intelligence - Structured Data Generation'.padEnd(78) + '║');
    console.log('║' + ' '.repeat(78) + '║');
    console.log('╚' + '═'.repeat(78) + '╝');

    console.log('\n📊 Starting metrics extraction for all processed issuers...\n');

    try {
        const result = await makeRequest('/metrics/extract-all', 'POST');

        if (result.status === 200 && result.data.success) {
            console.log('✅ Extraction completed!\n');

            const { summary, results } = result.data;

            console.log('📈 SUMMARY:');
            console.log(`   └─ Total Issuers: ${summary.total}`);
            console.log(`   └─ Successful: ${summary.successful}`);
            console.log(`   └─ Failed: ${summary.failed}`);
            console.log('');

            console.log('📋 DETAILED RESULTS:\n');

            results.forEach((result, idx) => {
                if (result.success) {
                    console.log(`${idx + 1}. ✅ ${result.issuerName}`);
                    const m = result.metrics;

                    // Show extracted data summary
                    const dataPoints = [];
                    if (m.calificacion?.rating) dataPoints.push(`Rating: ${m.calificacion.rating}`);
                    if (m.liquidez?.ratioCirculante) dataPoints.push(`Liquidez: ${m.liquidez.ratioCirculante.toFixed(2)}x`);
                    if (m.rentabilidad?.roe) dataPoints.push(`ROE: ${m.rentabilidad.roe.toFixed(1)}%`);
                    if (m.capital?.activosTotales) dataPoints.push(`Activos: ${m.capital.activosTotales.toFixed(1)}M`);

                    if (dataPoints.length > 0) {
                        console.log(`   └─ ${dataPoints.join(' | ')}`);
                    }
                    if (m.metadata?.periodo) {
                        console.log(`   └─ Período: ${m.metadata.periodo}`);
                    }
                } else {
                    console.log(`${idx + 1}. ❌ ${result.issuerName}`);
                    console.log(`   └─ Error: ${result.error}`);
                }
                console.log('');
            });

            console.log('═'.repeat(80));
            console.log('✅ Metrics extraction completed successfully!');
            console.log(`📊 ${summary.successful} emisores with structured financial data ready`);
            console.log('═'.repeat(80) + '\n');

        } else {
            console.error('❌ Extraction failed:', result.data.error || 'Unknown error');
            process.exit(1);
        }
    } catch (error) {
        console.error('\n❌ Fatal error:', error.message);
        process.exit(1);
    }
}

extractAllMetrics().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
