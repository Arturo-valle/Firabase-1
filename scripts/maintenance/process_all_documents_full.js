const https = require('https');
const fs = require('fs');

// ============================================================================
// CONFIGURACIÓN
// ============================================================================
const API_HOST = 'us-central1-mvp-nic-market.cloudfunctions.net';
const API_BASE_PATH = '/api';
const TIMEOUT_MS = 540000; // 9 minutos
const DELAY_BETWEEN_ISSUERS_MS = 30000; // 30 segundos entre emisores (más conservador)

// Emisores a procesar (en orden de prioridad)
const ISSUERS_TO_PROCESS = [
    { id: 'banco de finanzas', name: 'Banco De Finanzas', total: 152 },
    { id: 'corporacion agricola', name: 'Corporación Agricola', total: 133 },
    { id: 'fama', name: 'FAMA', total: 119 },
    { id: 'banco de la produccion', name: 'Banco De La Producción', total: 103 },
    { id: 'fid, sociedad anonima', name: 'FID, Sociedad Anónima', total: 43 },
    { id: 'financiera fdl', name: 'Financiera FDL', total: 21 },
    { id: 'invercasa safi', name: 'INVERCASA SAFI', total: 18 },
];

const LOG_FILE = 'processing_full_log.json';

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

function loadProgress() {
    try {
        if (fs.existsSync(LOG_FILE)) {
            return JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
        }
    } catch (error) {
        console.error('⚠️  Error loading progress file:', error.message);
    }
    return { processed: [], failed: [], startTime: null, estimatedCost: 0 };
}

function saveProgress(progress) {
    try {
        fs.writeFileSync(LOG_FILE, JSON.stringify(progress, null, 2));
    } catch (error) {
        console.error('⚠️  Error saving progress:', error.message);
    }
}

function makeRequest(path, method = 'POST') {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: API_HOST,
            path: `${API_BASE_PATH}${path}`,
            method: method,
            headers: { 'Content-Type': 'application/json' },
            timeout: TIMEOUT_MS,
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

        req.end();
    });
}

function calculateEstimatedCost(docsProcessed) {
    const CHUNKS_PER_DOC = 188.5;
    const CHARS_PER_CHUNK = 650;
    const COST_PER_1K_CHARS = 0.00002;

    const chunks = docsProcessed * CHUNKS_PER_DOC;
    const chars = chunks * CHARS_PER_CHUNK;
    const embeddingCost = (chars / 1000) * COST_PER_1K_CHARS;
    const firestoreCost = (chunks * 1.1 / 100000) * 0.18;
    const computeCost = (docsProcessed * 45 / 3600) * 0.01;

    return embeddingCost + firestoreCost + computeCost;
}

function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
}

// ============================================================================
// PROCESAMIENTO
// ============================================================================

async function processIssuerFull(issuer, index, total) {
    const startTime = Date.now();

    console.log('\n' + '='.repeat(80));
    console.log(`📊 [${index}/${total}] FULL Processing: ${issuer.name}`);
    console.log(`   └─ Issuer ID: ${issuer.id}`);
    console.log(`   └─ Total Documents: ${issuer.total}`);
    console.log(`   └─ Estimated Cost: $${calculateEstimatedCost(issuer.total).toFixed(4)}`);
    console.log('='.repeat(80));

    try {
        // IMPORTANT: Add ?processAll=true query parameter
        const result = await makeRequest(`/process-issuer/${encodeURIComponent(issuer.id)}?processAll=true`);
        const duration = (Date.now() - startTime) / 1000;

        if (result.status === 200) {
            console.log(`✅ SUCCESS - Processed in ${formatDuration(duration)}`);
            console.log(`   └─ Status: ${result.data.message || 'Completed'}`);

            return {
                success: true,
                issuerId: issuer.id,
                issuerName: issuer.name,
                duration,
                response: result.data,
                timestamp: new Date().toISOString(),
            };
        } else {
            throw new Error(`HTTP ${result.status}: ${result.data.error || 'Unknown error'}`);
        }
    } catch (error) {
        const duration = (Date.now() - startTime) / 1000;
        console.error(`❌ FAILED - ${error.message}`);

        return {
            success: false,
            issuerId: issuer.id,
            issuerName: issuer.name,
            error: error.message,
            duration,
            timestamp: new Date().toISOString(),
        };
    }
}

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
    console.clear();
    console.log('╔' + '═'.repeat(78) + '╗');
    console.log('║' + ' '.repeat(78) + '║');
    console.log('║' + '    🚀 FULL DOCUMENT PROCESSING - ALL 552 DOCUMENTS'.padEnd(78) + '║');
    console.log('║' + '    CentraCapital Intelligence - Complete Pipeline'.padEnd(78) + '║');
    console.log('║' + ' '.repeat(78) + '║');
    console.log('╚' + '═'.repeat(78) + '╝');

    let progress = loadProgress();
    const alreadyProcessed = new Set(progress.processed.map(p => p.issuerId));

    if (!progress.startTime) {
        progress.startTime = new Date().toISOString();
    }

    const remainingIssuers = ISSUERS_TO_PROCESS.filter(i => !alreadyProcessed.has(i.id));
    const totalDocs = remainingIssuers.reduce((sum, i) => sum + i.total, 0);

    console.log(`\n📋 FULL PROCESSING PLAN:`);
    console.log(`   └─ Total Issuers: ${ISSUERS_TO_PROCESS.length}`);
    console.log(`   └─ Already Processed: ${alreadyProcessed.size}`);
    console.log(`   └─ Remaining: ${remainingIssuers.length}`);
    console.log(`   └─ Total Documents to Process: ${totalDocs} (ALL AVAILABLE)`);
    console.log(`   └─ Estimated Time: ${formatDuration(totalDocs * 45)}`);
    console.log(`   └─ Estimated Cost: $${calculateEstimatedCost(totalDocs).toFixed(2)} USD`);

    if (remainingIssuers.length === 0) {
        console.log('\n✅ All issuers already processed!');
        return;
    }

    console.log(`\n⏱️  Starting in 5 seconds... (Press Ctrl+C to cancel)`);
    await delay(5000);

    const overallStartTime = Date.now();

    for (let i = 0; i < remainingIssuers.length; i++) {
        const issuer = remainingIssuers[i];
        const result = await processIssuerFull(issuer, i + 1, remainingIssuers.length);

        if (result.success) {
            progress.processed.push(result);
        } else {
            progress.failed.push(result);
        }

        const totalDocsProcessed = progress.processed.reduce((sum, p) => {
            const issuerData = ISSUERS_TO_PROCESS.find(i => i.id === p.issuerId);
            return sum + (issuerData?.total || 0);
        }, 0);
        progress.estimatedCost = calculateEstimatedCost(totalDocsProcessed);

        saveProgress(progress);

        if (i < remainingIssuers.length - 1) {
            console.log(`\n⏳ Waiting ${DELAY_BETWEEN_ISSUERS_MS / 1000}s before next issuer...`);
            await delay(DELAY_BETWEEN_ISSUERS_MS);
        }
    }

    const overallDuration = (Date.now() - overallStartTime) / 1000;

    console.log('\n\n' + '╔' + '═'.repeat(78) + '╗');
    console.log('║' + ' '.repeat(78) + '║');
    console.log('║' + '    📊 FULL PROCESSING COMPLETE - FINAL REPORT'.padEnd(78) + '║');
    console.log('║' + ' '.repeat(78) + '║');
    console.log('╚' + '═'.repeat(78) + '╝');

    console.log(`\n⏱️  TIMING:`);
    console.log(`   └─ Total Duration: ${formatDuration(overallDuration)}`);
    console.log(`   └─ Start Time: ${new Date(progress.startTime).toLocaleString()}`);
    console.log(`   └─ End Time: ${new Date().toLocaleString()}`);

    console.log(`\n✅ SUCCESS:`);
    console.log(`   └─ Issuers Processed: ${progress.processed.length}`);
    progress.processed.forEach(p => {
        console.log(`      • ${p.issuerName} (${formatDuration(p.duration)})`);
    });

    if (progress.failed.length > 0) {
        console.log(`\n❌ FAILURES:`);
        console.log(`   └─ Failed: ${progress.failed.length}`);
        progress.failed.forEach(p => {
            console.log(`      • ${p.issuerName}: ${p.error}`);
        });
    }

    console.log(`\n💰 FINAL COST:`);
    console.log(`   └─ Total Cost: $${progress.estimatedCost.toFixed(2)} USD`);
    console.log(`   └─ Documents Processed: ${totalDocs}`);

    console.log('\n' + '═'.repeat(80));
    console.log('✅ Full batch processing completed successfully!');
    console.log(`📄 Full log saved to: ${LOG_FILE}`);
    console.log('═'.repeat(80) + '\n');
}

process.on('SIGINT', () => {
    console.log('\n\n⚠️  Process interrupted by user. Progress has been saved.');
    console.log(`   Resume by running this script again.`);
    process.exit(0);
});

process.on('unhandledRejection', (error) => {
    console.error('\n❌ Unhandled error:', error);
    process.exit(1);
});

main().catch(error => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
});
