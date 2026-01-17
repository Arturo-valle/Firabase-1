const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

if (admin.apps.length === 0) admin.initializeApp();
const db = getFirestore();

// Reuse robust logic from the project
const { normalizeIssuerName } = require('../functions/src/utils/normalization');
const { ISSUER_METADATA, WHITELIST, ALIASES } = require('../functions/src/utils/issuerConfig');

/**
 * Helper to resolve the Canonical ID for any issuer doc
 */
function resolveCanonicalId(docId, docName) {
    const rawName = docName || docId;
    const normalized = normalizeIssuerName(rawName);

    // 1. Check if ID itself is in whitelist
    if (WHITELIST.includes(docId)) return docId;

    // 2. Check Alias Map
    if (ALIASES[normalized]) return ALIASES[normalized];

    // 3. Fallback: Check if normalized matches any whitelisted ID
    if (WHITELIST.includes(normalized)) return normalized;

    return null;
}

async function mergeDuplicates() {
    console.log('🚀 Starting Robust Deduplication & Merge...');

    // 1. Fetch EVERYTHING from issuers
    const snapshot = await db.collection('issuers').get();
    console.log(`📦 Loaded ${snapshot.size} total documents.`);

    const groups = {}; // Map<CanonicalID, Array<DocSnapshot>>

    // 2. Group documents by Canonical ID
    snapshot.docs.forEach(doc => {
        const data = doc.data();
        const canonicalId = resolveCanonicalId(doc.id, data.name);

        if (canonicalId) {
            if (!groups[canonicalId]) groups[canonicalId] = [];
            groups[canonicalId].push(doc);
        } else {
            console.warn(`❓ Orphaned Document found: [${doc.id}] Name: ${data.name} (Could not resolve to canonical ID)`);
        }
    });

    const batch = db.batch();
    let operationsCount = 0;

    // 3. Process each group
    for (const [canonicalId, docs] of Object.entries(groups)) {
        console.log(`\n🔹 Processing Group: [${canonicalId}] (${docs.length} docs)`);

        if (docs.length === 1 && docs[0].id === canonicalId) {
            console.log(`   ✅ Already clean.`);
            continue;
        }

        // Identify Target (Primary) Document
        let targetDoc = docs.find(d => d.id === canonicalId);

        // If target doesn't exist (e.g. all are variants like 'Agricorp'), create it from metadata
        let targetData = targetDoc ? targetDoc.data() : {
            id: canonicalId,
            ...ISSUER_METADATA[canonicalId],
            active: true,
            documents: []
        };

        // Initialize merging containers
        const mergedDocs = new Map(); // Map<URL, Document> to dedup by URL
        const sourcesToDelete = [];

        // Pre-populate with target's existing docs
        if (targetData.documents) {
            targetData.documents.forEach(d => mergedDocs.set(d.url, d));
        }

        // Merge logic
        for (const doc of docs) {
            const data = doc.data();

            // If this is NOT the target doc (or even if it IS, we essentially re-merge to be safe, but mostly we care about others)
            if (doc.id !== canonicalId) {
                sourcesToDelete.push(doc);

                // Merge Documents
                if (data.documents && Array.isArray(data.documents)) {
                    data.documents.forEach(d => {
                        if (d.url && !mergedDocs.has(d.url)) {
                            console.log(`      ➕ Merging document from [${doc.id}]: ${d.title || 'Untitled'}`);
                            mergedDocs.set(d.url, d);
                        }
                    });
                }
            }
        }

        // 4. Update Target
        const finalDocuments = Array.from(mergedDocs.values());
        const targetRef = db.collection('issuers').doc(canonicalId);

        console.log(`   📝 Updating [${canonicalId}] with ${finalDocuments.length} documents.`);
        batch.set(targetRef, {
            ...targetData,
            documents: finalDocuments,
            lastMergedAt: new Date().toISOString()
        }, { merge: true });
        operationsCount++;

        // 5. Backup & Delete Duplicates
        if (sourcesToDelete.length > 0) {
            console.log(`   🗑️ Deleting ${sourcesToDelete.length} duplicates...`);

            for (const doc of sourcesToDelete) {
                // BACKUP first
                const backupRef = db.collection('_deleted_issuers_backup').doc(`${doc.id}_${Date.now()}`);
                batch.set(backupRef, {
                    originalId: doc.id,
                    data: doc.data(),
                    deletedAt: new Date().toISOString(),
                    reason: `Merged into ${canonicalId}`
                });

                // DELETE
                batch.delete(doc.ref);
                operationsCount++;
            }
        }
    }

    // 6. Commit
    if (operationsCount > 0) {
        console.log(`\n💾 Committing ${operationsCount} operations to Firestore...`);
        await batch.commit();
        console.log('✅ Merge Complete.');
    } else {
        console.log('✨ No actions needed.');
    }
}

mergeDuplicates().catch(console.error);
