const fs = require('fs');
const https = require('https');

// Read processing list
const toProcess = JSON.parse(fs.readFileSync('issuers_to_process.json', 'utf8'));

async function processIssuer(issuerId) {
    return new Promise((resolve, reject) => {
        const url = `https://us-central1-mvp-nic-market.cloudfunctions.net/api/process-issuer/${encodeURIComponent(issuerId)}`;

        console.log(`\n🔄 Processing: ${issuerId}`);
        console.log(`   URL: ${url}`);

        const startTime = Date.now();

        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(url, options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                const duration = ((Date.now() - startTime) / 1000).toFixed(1);
                try {
                    const result = JSON.parse(data);
                    if (result.success) {
                        console.log(`   ✅ SUCCESS in ${duration}s: ${result.issuer} - ${result.processedCount} docs, ${result.errorCount} errors`);
                        resolve(result);
                    } else {
                        console.log(`   ❌ FAILED in ${duration}s: ${result.error || 'Unknown error'}`);
                        resolve({ success: false, issuerId, error: result.error });
                    }
                } catch (e) {
                    console.log(`   ❌ PARSE ERROR in ${duration}s: ${e.message}`);
                    resolve({ success: false, issuerId, error: e.message });
                }
            });
        }).on('error', (err) => {
            const duration = ((Date.now() - startTime) / 1000).toFixed(1);
            console.log(`   ❌ NETWORK ERROR in ${duration}s: ${err.message}`);
            resolve({ success: false, issuerId, error: err.message });
        }).setTimeout(540000, function () {  // 9 minute timeout
            this.destroy();
            const duration = ((Date.now() - startTime) / 1000).toFixed(1);
            console.log(`   ⏱️  TIMEOUT after ${duration}s`);
            resolve({ success: false, issuerId, error: 'Timeout' });
        });

        req.end();
    });
}

async function processBatch() {
    const highPriority = toProcess.high || [];
    const mediumPriority = toProcess.medium || [];

    // Filter out already processed ones
    const alreadyProcessed = ['fama', 'banco de la produccion', 'banco de finanzas', 'corporacion agricola'];
    const toProcessNow = highPriority.filter(id => !alreadyProcessed.includes(id.toLowerCase()));

    console.log('🚀 BATCH PROCESSING PLAN');
    console.log('='.repeat(80));
    console.log(`High Priority Issuers: ${toProcessNow.length}`);
    console.log(`Medium Priority Issuers: ${mediumPriority.length}`);
    console.log(`\nProcessing HIGH priority first...\n`);

    const results = {
        successful: [],
        failed: [],
        total: 0
    };

    // Process high priority with delays to avoid overwhelming the system
    for (let i = 0; i < toProcessNow.length; i++) {
        const issuerId = toProcessNow[i];
        console.log(`\n[${i + 1}/${toProcessNow.length}] ────────────────────────────────────────`);

        const result = await processIssuer(issuerId);
        results.total++;

        if (result.success) {
            results.successful.push({
                id: issuerId,
                name: result.issuer,
                docs: result.processedCount,
                errors: result.errorCount
            });
        } else {
            results.failed.push({
                id: issuerId,
                error: result.error
            });
        }

        // Wait 15 seconds between requests to avoid overwhelming
        if (i < toProcessNow.length - 1) {
            console.log(`\n⏳ Waiting 15 seconds before next issuer...`);
            await new Promise(resolve => setTimeout(resolve, 15000));
        }
    }

    // Summary
    console.log(`\n\n${'='.repeat(80)}`);
    console.log('📊 BATCH PROCESSING SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total Processed: ${results.total}`);
    console.log(`Successful: ${results.successful.length} ✅`);
    console.log(`Failed: ${results.failed.length} ❌`);

    if (results.successful.length > 0) {
        console.log(`\n✅ Successfully Processed:`);
        results.successful.forEach(r => {
            console.log(`   • ${r.name}: ${r.docs} documents (${r.errors} errors)`);
        });
    }

    if (results.failed.length > 0) {
        console.log(`\n❌ Failed:`);
        results.failed.forEach(r => {
            console.log(`   • ${r.id}: ${r.error}`);
        });
    }

    // Save results
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `processing_results_${timestamp}.json`;
    fs.writeFileSync(filename, JSON.stringify(results, null, 2));
    console.log(`\n💾 Results saved to: ${filename}`);
}

processBatch().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
