const admin = require('firebase-admin');
// Mock functions logger inline
const functions = require('firebase-functions');

// Initialize Admin
admin.initializeApp({
    projectId: 'mvp-nic-market'
});

// Mock firebase-functions loggers
// Simple mock for logger if not present or to see output in console
if (!functions.logger) {
    functions.logger = {
        info: console.log,
        warn: console.warn,
        error: console.error,
        debug: console.debug
    };
} else {
    // Override to ensure we see it in terminal
    functions.logger.info = console.log;
    functions.logger.warn = console.warn;
    functions.logger.error = console.error;
}

const { extractIssuerMetrics } = require('./functions/src/services/metricsExtractor');

async function run() {
    console.log("=== Triggering Manual Recalculation (Local Script) ===");

    // Issuers to update
    // Full list of 7 Active Issuers
    const issuers = [
        { id: 'banpro', name: 'Banco de la Produccion' },
        { id: 'bdf', name: 'Banco de Finanzas' },
        { id: 'fama', name: 'Fama' },
        { id: 'fdl', name: 'Financiera FDL' },
        { id: 'agricorp', name: 'Agricorp' }, // Corporacion Agricola
        { id: 'fid', name: 'FID' }, // FID Sociedad Anonima
        { id: 'horizonte', name: 'Horizonte' } // Fondo de Inversion
    ];

    for (const issuer of issuers) {
        console.log(`\nProcessing ${issuer.name} (${issuer.id})...`);
        try {
            const metrics = await extractIssuerMetrics(issuer.id, issuer.name);
            console.log(`SUCCESS for ${issuer.id}.`);
            console.log("Detected Currency:", metrics.metadata?.moneda);
            console.log("Total Assets:", metrics.capital?.activosTotales);
            console.log("Metadata Source:", metrics.metadata?.fuente);
            console.log("Note:", metrics.metadata?.nota);
        } catch (error) {
            console.error(`FAILED for ${issuer.id}:`, error.message);
        }
    }
}

run();
