const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');

// Initialize Firebase Admin (assuming default credentials or robust auth environment)
if (admin.apps.length === 0) {
    admin.initializeApp();
}
const db = getFirestore();

// Import Metadata Source of Truth
// Adjust path to point to functions/src/utils/issuerConfig.js
const { ISSUER_METADATA, WHITELIST } = require('../functions/src/utils/issuerConfig');

async function fixIssuersSchema() {
    console.log('🚀 Starting Issuer Data Remediation...');
    console.log(`🔹 Project ID: ${admin.app().options.projectId || 'Auto-detected'}`);
    console.log(`📋 Target Whitelist: ${WHITELIST.join(', ')}`);

    const batch = db.batch();
    let updatesCount = 0;
    let createsCount = 0;

    for (const issuerId of WHITELIST) {
        const metadata = ISSUER_METADATA[issuerId];
        if (!metadata) {
            console.warn(`⚠️ No metadata found for ${issuerId}, skipping.`);
            continue;
        }

        const docRef = db.collection('issuers').doc(issuerId);
        const docSnapshot = await docRef.get();

        if (docSnapshot.exists) {
            const data = docSnapshot.data();

            // DEBUG: Print agricorp data to verify what the script sees
            if (issuerId === 'agricorp') {
                console.log(`🔍 DEBUG: agricorp data keys: ${Object.keys(data).join(', ')}`);
                console.log(`🔍 DEBUG: agricorp name value: "${data.name}"`);
            }

            const needsRepair = !data.name || data.name.trim() === '';

            if (needsRepair) {
                console.log(`🔧 REPAIRING: ${issuerId} (Missing 'name')`);
                batch.update(docRef, {
                    name: metadata.name, // Restore from Source of Truth
                    acronym: metadata.acronym, // Ensure acronym is synced
                    sector: metadata.sector,   // Ensure sector is synced
                    active: true
                });
                updatesCount++;
            } else {
                console.log(`✅ OK: ${issuerId}`);
            }
        } else {
            // BACKFILL LOGIC
            console.log(`🆕 CREATING: ${issuerId} (Missing in DB)`);

            const newDoc = {
                id: issuerId,
                name: metadata.name,
                acronym: metadata.acronym,
                sector: metadata.sector,
                active: true,
                documents: [], // CRITICAL: Prevent UI crash on empty list
                lastUpdated: new Date().toISOString(),
                source: 'fix_issuers_schema.js'
            };

            batch.set(docRef, newDoc);
            createsCount++;
        }
    }

    if (updatesCount > 0 || createsCount > 0) {
        console.log(`💾 Committing changes... (Updates: ${updatesCount}, Creates: ${createsCount})`);
        await batch.commit();
        console.log('🎉 Remediation Complete!');
    } else {
        console.log('✨ No changes needed. All issuers valid.');
    }
}

fixIssuersSchema().catch(console.error);
