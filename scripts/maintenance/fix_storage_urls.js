
const admin = require("firebase-admin");
const axios = require("axios");
const path = require("path");

if (!admin.apps.length) {
    admin.initializeApp({
        projectId: "mvp-nic-market",
        storageBucket: "mvp-nic-market.firebasestorage.app"
    });
}

const db = admin.firestore();
const storage = admin.storage();

async function downloadAndStore(url, destinationPath) {
    if (!url || !url.startsWith("http")) return null;
    try {
        const bucket = storage.bucket();
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 20000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        const file = bucket.file(destinationPath);
        await file.save(response.data, {
            resumable: false,
            metadata: { contentType: 'application/pdf' }
        });

        await file.makePublic();
        return file.publicUrl();
    } catch (error) {
        console.error(`  - Failed ${url}: ${error.message}`);
        return null;
    }
}

async function fixStorageUrls() {
    console.log("🚀 Starting Storage URL Fix Migration...");

    const issuersSnapshot = await db.collection("issuers").get();

    for (const doc of issuersSnapshot.docs) {
        const issuerId = doc.id;
        const data = doc.data();
        const documents = data.documents || [];

        console.log(`\nProcessing ${issuerId} (${documents.length} docs)...`);

        let changed = false;
        const updatedDocs = [];

        for (const fileDoc of documents) {
            // Already in storage?
            if (fileDoc.url.includes('firebasestorage.app') || fileDoc.url.includes('storage.googleapis.com')) {
                updatedDocs.push(fileDoc);
                continue;
            }

            console.log(`  - Migrating: ${fileDoc.title.substring(0, 50)}...`);

            const fileName = path.basename(new URL(fileDoc.url, "https://www.bolsanic.com").pathname) || `doc_${Date.now()}.pdf`;
            const destination = `documents/${issuerId}/${fileName}`;

            const publicUrl = await downloadAndStore(fileDoc.url, destination);

            if (publicUrl) {
                updatedDocs.push({
                    ...fileDoc,
                    url: publicUrl,
                    originalUrl: fileDoc.url,
                    migratedAt: new Date()
                });
                changed = true;
            } else {
                // Keep original if failed
                updatedDocs.push(fileDoc);
            }
        }

        if (changed) {
            await db.collection("issuers").doc(issuerId).update({
                documents: updatedDocs,
                lastMaintenanceSync: admin.firestore.FieldValue.serverTimestamp()
            });
            console.log(`  ✅ Updated ${issuerId} in Firestore.`);
        } else {
            console.log(`  ℹ️ No changes needed for ${issuerId}.`);
        }
    }

    console.log("\n🏁 Migration complete.");
}

fixStorageUrls().catch(console.error);
