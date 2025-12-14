const https = require('https');
const fs = require('fs');

// ============================================================================
// CONFIGURACIÓN - SMART BATCHING
// ============================================================================
const API_HOST = 'us-central1-mvp-nic-market.cloudfunctions.net';
const API_BASE_PATH = '/api';
const TIMEOUT_MS = 540000; // 9 minutos
const DELAY_BETWEEN_BATCHES_MS = 15000; // 15 segundos entre batches
const BATCH_SIZE = 20; // Procesar 20 documentos a la vez (sweet spot)

// Emisores con documentos pendientes
const ISSUERS_TO_PROCESS = [
    { id: 'banco de finanzas', name: 'Banco De Finanzas', total: 152 },
    { id: 'corporacion agricola', name: 'Corporación Agricola', total: 133 },
    { id: 'fama', name: 'FAMA', total: 119 },
    { id: 'banco de la produccion', name: 'Banco De La Producción', total: 103 },
    { id: 'fid, sociedad anonima', name: 'FID, Sociedad Anónima', total: 43 },
    { id: 'financiera fdl', name: 'Financiera FDL', total: 21 },
    { id: 'invercasa safi', name: 'INVERCASA SAFI', total: 18 },
];

const LOG_FILE = 'processing_smart_batch_log.json';

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
    return {
        batches: [],
        failed: [],
        startTime: null,
        totalDocsProcessed: 0,
        estimatedCost: 0
    };
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

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// PROCESAMIENTO POR BATCHES
// ============================================================================

async function processBatch(issuer, batchNumber, totalBatches) {
    const startTime = Date.now();

    console.log('\n' + '─'.repeat(80));
    console.log(`📦 Batch ${batchNumber}/${totalBatches} - ${issuer.name}`);
    console.log(`   └─ Issuer ID: ${issuer.id}`);
    console.log(`   └─ Processing up to ${BATCH_SIZE} documents`);
    console.log('─'.repeat(80));

    try {
        // Usar el endpoint estándar que automáticamente procesa top 10-20 docs prioritarios
        const result = await makeRequest(`/process-issuer/${encodeURIComponent(issuer.id)}`);
        const duration = (Date.now() - startTime) / 1000;

        if (result.status === 200) {
            console.log(`✅ SUCCESS - Batch processed in ${formatDuration(duration)}`);
            console.log(`   └─ Status: ${result.data.message || 'Completed'}`);

            return {
                success: true,
                issuerId: issuer.id,
                issuerName: issuer.name,
                batchNumber,
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
            batchNumber,
            error: error.message,
            duration,
            timestamp: new Date().toISOString(),
        };
    }
}

// ============================================================================
// MAIN - SMART BATCH PROCESSOR
// ============================================================================

async function main() {
    console.clear();
    console.log('╔' + '═'.repeat(78) + '╗');
    console.log('║' + ' '.repeat(78) + '║');
    console.log('║' + '    🚀 SMART BATCH PROCESSING - Optimized for Cloud Functions'.padEnd(78) + '║');
    console.log('║' + '    CentraCapital Intelligence - Incremental Document Processing'.padEnd(78) + '║');
    console.log('║' + ' '.repeat(78) + '║');
    console.log('╚' + '═'.repeat(78) + '╝');

    let progress = loadProgress();

    if (!progress.startTime) {
        progress.startTime = new Date().toISOString();
    }

    // Calcular batches pendientes
    const processedBatchIds = new Set(progress.batches.map(b => `${b.issuerId}-${b.batchNumber}`));
    const allBatches = [];

    for (const issuer of ISSUERS_TO_PROCESS) {
        const numBatches = Math.ceil(issuer.total / BATCH_SIZE);
        for (let i = 1; i <= numBatches; i++) {
            const batchId = `${issuer.id}-${i}`;
            if (!processedBatchIds.has(batchId)) {
                allBatches.push({ issuer, batchNumber: i, totalBatches: numBatches });
            }
        }
    }

    console.log(`\n📋 SMART BATCH PLAN:`);
    console.log(`   └─ Total Issuers: ${ISSUERS_TO_PROCESS.length}`);
    console.log(`   └─ Batch Size: ${BATCH_SIZE} docs`);
    console.log(`   └─ Already Processed Batches: ${progress.batches.length}`);
    console.log(`   └─ Remaining Batches: ${allBatches.length}`);
    console.log(`   └─ Estimated Time: ${formatDuration(allBatches.length * 45)}`); // ~45s por batch
    console.log(`   └─ Total Documents Target: ~${allBatches.length * BATCH_SIZE}`);

    if (allBatches.length === 0) {
        console.log('\n✅ All batches already processed!');
        return;
    }

    console.log(`\n⏱️  Starting in 5 seconds... (Press Ctrl+C to cancel)`);
    await delay(5000);

    const overallStartTime = Date.now();
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < allBatches.length; i++) {
        const { issuer, batchNumber, totalBatches } = allBatches[i];

        console.log(`\n[${i + 1}/${allBatches.length}] Processing batch...`);
        const result = await processBatch(issuer, batchNumber, totalBatches);

        if (result.success) {
            progress.batches.push(result);
            successCount++;
            progress.totalDocsProcessed += BATCH_SIZE; // Aproximación
        } else {
            progress.failed.push(result);
            failCount++;
        }

        progress.estimatedCost = calculateEstimatedCost(progress.totalDocsProcessed);
        saveProgress(progress);

        // Progress bar
        const percent = ((i + 1) / allBatches.length * 100).toFixed(1);
        const bar = '█'.repeat(Math.floor(percent / 2)) + '░'.repeat(50 - Math.floor(percent / 2));
        console.log(`\n📊 Progress: [${bar}] ${percent}%`);
        console.log(`   ✅ Success: ${successCount} | ❌ Failed: ${failCount}`);
        console.log(`   💰 Estimated Cost: $${progress.estimatedCost.toFixed(2)} USD`);

        if (i < allBatches.length - 1) {
            console.log(`\n⏳ Waiting ${DELAY_BETWEEN_BATCHES_MS / 1000}s before next batch...`);
            await delay(DELAY_BETWEEN_BATCHES_MS);
        }
    }

    const overallDuration = (Date.now() - overallStartTime) / 1000;

    console.log('\n\n' + '╔' + '═'.repeat(78) + '╗');
    console.log('║' + ' '.repeat(78) + '║');
    console.log('║' + '    📊 SMART BATCH PROCESSING COMPLETE - FINAL REPORT'.padEnd(78) + '║');
    console.log('║' + ' '.repeat(78) + '║');
    console.log('╚' + '═'.repeat(78) + '╝');

    console.log(`\n⏱️  TIMING:`);
    console.log(`   └─ Total Duration: ${formatDuration(overallDuration)}`);
    console.log(`   └─ Start Time: ${new Date(progress.startTime).toLocaleString()}`);
    console.log(`   └─ End Time: ${new Date().toLocaleString()}`);
    console.log(`   └─ Avg Time/Batch: ${formatDuration(overallDuration / allBatches.length)}`);

    console.log(`\n✅ SUCCESS:`);
    console.log(`   └─ Batches Completed: ${successCount}/${allBatches.length}`);
    console.log(`   └─ Success Rate: ${(successCount / allBatches.length * 100).toFixed(1)}%`);

    if (failCount > 0) {
        console.log(`\n❌ FAILURES:`);
        console.log(`   └─ Failed Batches: ${failCount}`);
        console.log(`   └─ Retry these manually if needed`);
    }

    console.log(`\n💰 FINAL COST:`);
    console.log(`   └─ Total Cost: $${progress.estimatedCost.toFixed(2)} USD`);
    console.log(`   └─ Docs Processed: ~${progress.totalDocsProcessed}`);

    console.log('\n' + '═'.repeat(80));
    console.log('✅ Smart batch processing completed successfully!');
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
