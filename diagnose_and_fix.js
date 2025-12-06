// Deep diagnostic and auto-fix script for Firestore data
const admin = require('firebase-admin');

// Initialize with application default credentials (works in Cloud Shell or with gcloud auth)
admin.initializeApp({
    projectId: 'mvp-nic-market'
});

const db = admin.firestore();

async function diagnoseAndFix() {
    console.log('🔍 Starting Deep System Diagnostic...\n');

    // 1. Check issuers collection
    console.log('📊 Step 1: Checking Issuers Collection');
    const issuersSnapshot = await db.collection('issuers').get();
    console.log(`   Total issuers in DB: ${issuersSnapshot.size}`);

    if (issuersSnapshot.empty) {
        console.log('❌ ERROR: Issuers collection is EMPTY!');
        return;
    }

    // 2. Analyze issuer states
    console.log('\n📊 Step 2: Analyzing Issuer States');
    const issuerStats = {
        total: 0,
        active: 0,
        inactive: 0,
        withProcessedDocs: 0,
        withoutProcessedDocs: 0,
        needsActivation: []
    };

    issuersSnapshot.forEach(doc => {
        const data = doc.data();
        issuerStats.total++;

        if (data.isActive === true) {
            issuerStats.active++;
        } else {
            issuerStats.inactive++;
        }

        const processed = data.documentsProcessed || 0;
        if (processed > 0) {
            issuerStats.withProcessedDocs++;

            // If has data but not active, needs activation
            if (data.isActive !== true) {
                issuerStats.needsActivation.push({
                    id: doc.id,
                    name: data.name,
                    processed: processed,
                    isActive: data.isActive
                });
            }
        } else {
            issuerStats.withoutProcessedDocs++;
        }
    });

    console.log(`   Active: ${issuerStats.active}`);
    console.log(`   Inactive: ${issuerStats.inactive}`);
    console.log(`   With Processed Docs: ${issuerStats.withProcessedDocs}`);
    console.log(`   Without Processed Docs: ${issuerStats.withoutProcessedDocs}`);
    console.log(`   Needs Activation: ${issuerStats.needsActivation.length}`);

    // 3. Check document chunks
    console.log('\n📊 Step 3: Checking Document Chunks');
    const chunksCount = await db.collection('documentChunks').count().get();
    console.log(`   Total chunks: ${chunksCount.data().count}`);

    // 4. Show issuers needing activation
    if (issuerStats.needsActivation.length > 0) {
        console.log('\n⚠️  Step 4: Issuers with Data But NOT Active:');
        issuerStats.needsActivation.forEach((issuer, idx) => {
            console.log(`   ${idx + 1}. ${issuer.name} (${issuer.id})`);
            console.log(`      - Processed: ${issuer.processed} docs`);
            console.log(`      - isActive: ${issuer.isActive}`);
        });

        // 5. FIX IT!
        console.log('\n🔧 Step 5: ACTIVATING These Issuers...');
        const batch = db.batch();

        issuerStats.needsActivation.forEach(issuer => {
            const ref = db.collection('issuers').doc(issuer.id);
            batch.update(ref, { isActive: true });
        });

        await batch.commit();
        console.log(`✅ Successfully activated ${issuerStats.needsActivation.length} issuers!`);

        // 6. Verify fix
        console.log('\n✅ Step 6: Verifying Fix');
        const activeCheck = await db.collection('issuers').where('isActive', '==', true).get();
        console.log(`   Active issuers now: ${activeCheck.size}`);

        console.log('\n📋 Active Issuers List:');
        activeCheck.forEach((doc, idx) => {
            const data = doc.data();
            console.log(`   ${idx + 1}. ${data.name} - ${data.documentsProcessed || 0} docs`);
        });
    } else {
        console.log('\n✅ All issuers with processed docs are already active!');
    }

    console.log('\n🎉 Diagnostic Complete!');
}

diagnoseAndFix()
    .then(() => process.exit(0))
    .catch(err => {
        console.error('❌ Error:', err);
        process.exit(1);
    });
