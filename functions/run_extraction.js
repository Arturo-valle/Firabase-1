
const fs = require('fs');
const path = require('path');
const logFile = path.resolve(__dirname, 'extraction.log');

function log(msg) {
    const timestamp = new Date().toISOString();
    const formatted = `[${timestamp}] ${msg}\n`;
    console.log(msg);
    fs.appendFileSync(logFile, formatted);
}

// Clear log file
fs.writeFileSync(logFile, '');

const admin = require('firebase-admin');
if (!admin.apps.length) admin.initializeApp();
const { extractIssuerMetrics } = require('./src/services/metricsExtractor');

async function run() {
    try {
        log('--- STARTING EXTRACTION BATCH (BANKS AUDIT) ---');

        // BDF (Prueba de Activos Nulos)
        log('Regenerating BDF (Audit)...');
        const r1 = await extractIssuerMetrics('bdf', 'BDF');
        log('BDF_METRICS_RESULT: ' + JSON.stringify(r1, null, 2));

        // BANPRO (Prueba de Reglas Bancarias)
        log('Regenerating BANPRO (Audit)...');
        const r2 = await extractIssuerMetrics('banpro', 'Banpro');
        log('BANPRO_METRICS_RESULT: ' + JSON.stringify(r2, null, 2));

        // BDF Historical
        log('Regenerating BDF History...');
        const { extractHistoricalMetrics } = require('./src/services/metricsExtractor');
        const r3 = await extractHistoricalMetrics('bdf', 'BDF');
        log('BDF_HISTORY_RESULT: ' + JSON.stringify(r3, null, 2));

        log('--- EXTRACTION BATCH COMPLETED ---');
    } catch (e) {
        log('BATCH_ERROR: ' + e.stack);
    } finally {
        log('Finished. Exiting in 5s...');
        setTimeout(() => process.exit(0), 5000);
    }
}

run();
