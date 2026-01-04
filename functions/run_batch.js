
var fs = require('fs');
var path = require('path');
var logFile = path.resolve(__dirname, 'extraction.log');

function log(msg) {
    var timestamp = new Date().toISOString();
    var formatted = `[${timestamp}] ${msg}\n`;
    console.log(msg);
    fs.appendFileSync(logFile, formatted);
}

fs.writeFileSync(logFile, '');

var admin = require('firebase-admin');
if (!admin.apps.length) {
    admin.initializeApp({
        projectId: 'mvp-nic-market'
    });
}
var { extractIssuerMetrics } = require('./src/services/metricsExtractor');

async function runBatch() {
    try {
        log('--- STARTING EXTRACTION BATCH ---');

        log('Regenerating FID...');
        var r1 = await extractIssuerMetrics('fid', 'FID');
        log('FID_RESULT: ' + JSON.stringify(r1));

        log('Regenerating HORIZONTE...');
        var r2 = await extractIssuerMetrics('horizonte', 'Horizonte');
        log('HORIZONTE_RESULT: ' + JSON.stringify(r2));

        log('Regenerating AGRI-CORP...');
        var r3 = await extractIssuerMetrics('agri-corp', 'Agri-Corp');
        log('AGRI_RESULT: ' + JSON.stringify(r3));

        log('--- EXTRACTION BATCH COMPLETED ---');
    } catch (e) {
        log('BATCH_ERROR: ' + (e.stack || e.message));
    } finally {
        log('Finished Batch.');
    }
}

module.exports = runBatch;
