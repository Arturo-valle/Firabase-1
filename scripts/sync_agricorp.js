const admin = require('firebase-admin');
const axios = require('axios');
const path = require('path');
const { getStorage } = require("firebase-admin/storage");
const { scrapeBolsanicDocuments } = require('../functions/src/scrapers/getBolsanicDocuments');

// --- SETUP ---
process.env.GCLOUD_PROJECT = 'mvp-nic-market';
if (!admin.apps.length) {
    admin.initializeApp({
        projectId: "mvp-nic-market",
        storageBucket: "mvp-nic-market.firebasestorage.app"
    });
}
const db = admin.firestore();

// --- MOCK LOGGER ---
global.functions = {
    logger: {
        info: console.log,
        error: console.error,
        warn: console.warn
    }
};

// --- UTILS ---
async function downloadAndStore(url, destinationPath) {
    if (!url || !url.startsWith("http")) return null;
    try {
        const bucket = getStorage().bucket(); // Default bucket
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 60000,
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
            maxRedirects: 5
        });

        const file = bucket.file(destinationPath);
        await file.save(response.data, {
            resumable: false,
            metadata: { contentType: 'application/pdf' }
        });

        await file.makePublic();
        return file.publicUrl();
    } catch (error) {
        console.error(`Error downloading ${url}:`, error.message);
        return null;
    }
}

async function run() {
    console.log("🚀 STARTING AGRICORP SYNC (2021-2025 Recovery)...");

    // 1. Get Issuer Config
    const issuerId = "agricorp";
    const issuerDoc = await db.collection('issuers').doc(issuerId).get();
    if (!issuerDoc.exists) {
        console.error("❌ Agricorp doc not found in Firestore.");
        process.exit(1);
    }
    const issuerData = issuerDoc.data();

    // 2. Scrape Docs (Using UPDATED scraper)
    const detailUrl = "https://www.bolsanic.com/emisor-corporacionesagricolas/";
    console.log(`\n📡 Scraping ${detailUrl}...`);

    let scrapedDocs = [];
    try {
        scrapedDocs = await scrapeBolsanicDocuments(detailUrl);
        console.log(`✅ Scraped ${scrapedDocs.length} total documents.`);
    } catch (e) {
        console.error("❌ Scrape failed:", e);
        process.exit(1);
    }

    // 3. Filter for 2021-2025
    const targetDocs = scrapedDocs.filter(d => {
        const y = new Date(d.date).getFullYear();
        return y >= 2021;
    });
    console.log(`🎯 Found ${targetDocs.length} documents from 2021-2025.`);

    if (targetDocs.length === 0) {
        console.warn("⚠️ No recent documents found. Check scraper logic.");
        process.exit(0);
    }

    // 4. Merge with existing docs to avoid duplicates
    const existingDocs = issuerData.documents || [];
    const uniqueDocsMap = new Map();

    existingDocs.forEach(d => uniqueDocsMap.set(d.url, d)); // Old docs
    targetDocs.forEach(d => uniqueDocsMap.set(d.url, d));   // New docs (overwrite if same URL)

    const mergedDocs = Array.from(uniqueDocsMap.values());
    console.log(`📊 Processing unique docs: ${mergedDocs.length} (Existing: ${existingDocs.length} + New/Updated)`);

    // 5. Download & Upload to Storage (Parallelized & Prioritized)
    const finalStoredDocs = [...existingDocs]; // Start with existing
    let processedCount = 0;

    // Check which ones are new and need download
    let docsToDownload = mergedDocs.filter(d => {
        const isStorageUrl = d.url.includes('firebasestorage') || d.url.includes('googleapis');
        // Only download if it's NOT a storage URL AND it is recent (optimization)
        const isRecent = new Date(d.date).getFullYear() >= 2021;
        // Don't redownload if we already have it in finalStoredDocs form (dedupe check by url)
        const alreadyHas = finalStoredDocs.find(fd => fd.url === d.url && fd.storedInStorage); // Fixed logic: check by url IF it is updated
        // Actually better: check if current finalStoredDocs has a storage URL for this original URL
        const existingEntry = finalStoredDocs.find(fd => fd.originalUrl === d.url && fd.storedInStorage);
        return !isStorageUrl && isRecent && !existingEntry;
    });

    // PRIORITIZATION: Financial Statements -> Risk -> Others
    docsToDownload.sort((a, b) => {
        const score = (doc) => {
            const t = (doc.title || '').toLowerCase();
            if (t.includes('financiero') || t.includes('ef ') || t.includes('auditado')) return 3;
            if (t.includes('calificaci') || t.includes('riesgo')) return 2;
            if (t.includes('prospecto')) return 0; // Huge files, do last
            return 1;
        };
        return score(b) - score(a);
    });

    console.log(`⬇️ Downloading ${docsToDownload.length} new recent documents to Storage (Optimized)...`);

    // Concurrency Helper
    const BATCH_SIZE = 5;
    for (let i = 0; i < docsToDownload.length; i += BATCH_SIZE) {
        const batch = docsToDownload.slice(i, i + BATCH_SIZE);
        console.log(`\n📦 Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(docsToDownload.length / BATCH_SIZE)}...`);

        await Promise.all(batch.map(async (doc) => {
            try {
                console.log(`   ⬇️ Downloading: ${doc.title.substring(0, 40)}...`);
                // Shorten filename to avoid issues
                const safeTitle = path.basename(doc.title).replace(/[^a-z0-9]/gi, '_').substring(0, 50);
                const fileName = `rec_${Date.now()}_${safeTitle}.pdf`;
                const dest = `documents/${issuerId}/${fileName}`;

                const publicUrl = await downloadAndStore(doc.url, dest);

                if (publicUrl) {
                    // Update the doc object in our final list
                    // Remove old entry if exists and add new one
                    const idx = finalStoredDocs.findIndex(d => d.url === doc.url);
                    const newEntry = {
                        ...doc,
                        url: publicUrl,
                        originalUrl: doc.url,
                        storedInStorage: true,
                        lastSynced: new Date().toISOString()
                    };

                    if (idx > -1) finalStoredDocs[idx] = newEntry;
                    else finalStoredDocs.push(newEntry);

                    console.log(`   ✅ Saved: ${safeTitle}`);
                } else {
                    console.warn(`   ⚠️ Keep original: ${safeTitle}`);
                    // Ensure it's in the list even if download failed
                    if (!finalStoredDocs.find(d => d.url === doc.url)) finalStoredDocs.push(doc);
                }
            } catch (e) {
                console.error(`   ❌ Error ${doc.title}: ${e.message}`);
                if (!finalStoredDocs.find(d => d.url === doc.url)) finalStoredDocs.push(doc);
            }
        }));

        // CLAIM: Incremental Update every batch to save progress
        console.log("   💾 Saving batch progress...");
        await db.collection('issuers').doc(issuerId).update({
            documents: finalStoredDocs,
            lastSync: admin.firestore.FieldValue.serverTimestamp()
        });
    }

    console.log("✅ SYNC COMPLETE.");
    process.exit(0);
}

run();
