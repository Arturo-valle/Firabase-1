const admin = require('firebase-admin');
const { issuers } = require('../functions/src/data/issuers');
const { WHITELIST } = require('../functions/src/utils/issuerConfig');

// Set project ID explicitly
process.env.GCLOUD_PROJECT = 'mvp-nic-market';

// Initialize
if (!admin.apps.length) {
    admin.initializeApp({
        projectId: "mvp-nic-market"
    });
}
const db = admin.firestore();

async function seed() {
    console.log("🌱 Seeding issuers...");
    const batch = db.batch();
    let count = 0;

    for (const issuer of issuers) {
        let id = issuer.acronym ? issuer.acronym.toLowerCase() : issuer.name.toLowerCase().replace(/[^a-z0-9]/g, '_');

        // Manual override for Credifactor if needed to match whitelist ID
        // The whitelist uses "credifactor", the logic above produces "credifactor" from "CREDIFACTOR". Correct.

        if (WHITELIST.includes(id)) {
            const ref = db.collection('issuers').doc(id);
            // We set isActive = true for whitelisted ones
            const data = {
                ...issuer,
                id: id,
                isActive: true,
                lastUpdated: new Date().toISOString()
            };

            // Only merge to avoid overwriting existing computed fields like documentsProcessed
            batch.set(ref, data, { merge: true });
            count++;
            console.log(`+ Prepared ${id}`);
        }
    }

    await batch.commit();
    console.log(`✅ Seeded ${count} issuers.`);
    process.exit(0);
}

seed().catch(e => {
    console.error(e);
    process.exit(1);
});
