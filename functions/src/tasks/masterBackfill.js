const { runBackfill } = require('./backfillVectors');
const admin = require('firebase-admin');

async function runMasterBackfill() {
    if (admin.apps.length === 0) admin.initializeApp();

    const issuers = ['agricorp', 'fama', 'banpro', 'fdl', 'horizonte', 'bdf'];

    console.log('🏁 Starting Master Backfill for issuers:', issuers.join(', '));

    for (const id of issuers) {
        console.log(`\n\n--- PROCESSING ${id.toUpperCase()} ---`);
        try {
            await runBackfill(id, 30); // Process up to 30 docs per issuer
            console.log(`✅ Finished ${id}`);
        } catch (e) {
            console.error(`❌ Error in ${id}:`, e.message);
        }
        // Wait 10 seconds between issuers to avoid rate limits
        await new Promise(r => setTimeout(r, 10000));
    }

    console.log('\n\n✨ ALL ISSUERS PROCESSED ✨');
}

runMasterBackfill();
