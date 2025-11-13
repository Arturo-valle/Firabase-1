
const { getFirestore } = require("firebase-admin/firestore");
const functions = require("firebase-functions");
const { getStorage } = require("firebase-admin/storage");
const axios = require("axios");
const path = require("path");
const { scrapeIssuers } = require("../scrapers/getIssuers");
const { scrapeBolsanicDocuments } = require("../scrapers/getBolsanicDocuments");
const { scrapeBolsanicFacts } = require("../scrapers/getBolsanicFacts");
const { scrapeBcnExchangeRate } = require("../scrapers/getBcnRates");

// Helper function to get a clean name for folders and IDs
const getBaseName = (name) => {
    if (!name) {
        functions.logger.warn("Received a null or undefined name to clean. Using 'unknown_issuer'.");
        return "unknown_issuer";
    }
    const baseName = name.split(',')[0].split('(')[0].trim();
    if (!baseName) {
        functions.logger.warn(`Could not extract a base name from '${name}'. Using 'unnamed_issuer'.`);
        return "unnamed_issuer";
    }
    return baseName;
};

// Helper to download a single file
async function downloadAndStore(url, destinationPath) {
    if (!url || !url.startsWith("http")) {
        functions.logger.error(`[FATAL] downloadAndStore called with invalid URL: ${url}`);
        return null;
    }
    if (!destinationPath.includes('/')) {
        functions.logger.error(`[FATAL] downloadAndStore called with invalid destination: ${destinationPath}. It is missing a parent folder.`);
        return null;
    }
    // Check for 'undefined' one last time
    if (destinationPath.includes('undefined')) {
         functions.logger.error(`[FATAL] ABORTING DOWNLOAD. Destination path contains 'undefined': ${destinationPath}`);
         // Throw an error to halt the process if this ever happens.
         throw new Error(`FATAL: Attempted to write to an 'undefined' path: ${destinationPath}`);
    }

    try {
        const bucket = getStorage().bucket();
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        const file = bucket.file(destinationPath);
        await file.save(response.data, { resumable: false });
        await file.makePublic();
        functions.logger.info(`  -> SUCCESS: Stored at ${file.publicUrl()}`);
        return file.publicUrl();
    } catch (error) {
        functions.logger.error(`  -> FAILED to download from ${url} to ${destinationPath}. Error: ${error.message}`);
        if (error.code === 429) {
            functions.logger.error("  -> RATE LIMIT EXCEEDED. The sequential logic has failed. This is a critical error.");
        }
        return null;
    }
}

const scrapeAndStore = async () => {
    const db = getFirestore();
    functions.logger.info("V5 START: Final, ultra-robust sequential process initiated.");

    // Clear old data first to ensure a clean slate.
    functions.logger.info("V5: Deleting all old data from 'issuers' collection...");
    const snapshot = await db.collection("issuers").get();
    if (snapshot.size > 0) {
        const batch = db.batch();
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        functions.logger.info(`V5: Deleted ${snapshot.size} old documents.`);
    } else {
        functions.logger.info("V5: No old data to delete.");
    }
    
    // Scrape primary sources.
    functions.logger.info("V5: Scraping primary sources (issuers, facts, rate)...");
    const [rawIssuers, allFacts, exchangeRate] = await Promise.all([
        scrapeIssuers(),
        scrapeBolsanicFacts(),
        scrapeBcnExchangeRate(),
    ]);
    functions.logger.info(`V5: Found ${rawIssuers.length} issuers, ${allFacts.length} facts.`);

    // Store exchange rate.
    if (exchangeRate) {
        await db.collection("bcn").doc("exchangeRate").set({ rate: exchangeRate, lastUpdated: new Date() });
    }

    // Create a map of all unique issuers from both lists.
    const uniqueIssuers = new Map();
    rawIssuers.forEach(i => {
        const baseName = getBaseName(i.name);
        if (!uniqueIssuers.has(baseName)) uniqueIssuers.set(baseName, { name: i.name, acronym: i.acronym, sector: i.sector, detailUrl: i.detailUrl });
    });
    allFacts.forEach(f => {
        const baseName = getBaseName(f.issuerName);
        if (!uniqueIssuers.has(baseName)) uniqueIssuers.set(baseName, { name: baseName, acronym: "", sector: "N/A", detailUrl: null });
    });
     functions.logger.info(`V5: Consolidated into ${uniqueIssuers.size} unique issuers. Starting main loop.`);

    // --- MAIN SEQUENTIAL LOOP ---
    // Process one issuer at a time, from start to finish.
    for (const [baseName, issuerInfo] of uniqueIssuers.entries()) {
        functions.logger.info(`V5: Processing Issuer: [${baseName}]`);

        if (!baseName || baseName === 'undefined') {
            functions.logger.error(`[FATAL] Main loop encountered an invalid baseName. Skipping issuer. Data: ${JSON.stringify(issuerInfo)}`);
            continue;
        }

        const documentsToDownload = [];

        // 1. Get documents from the detail page, if it exists.
        if (issuerInfo.detailUrl) {
            const detailDocs = await scrapeBolsanicDocuments(issuerInfo.detailUrl);
            detailDocs.forEach(doc => documentsToDownload.push({ ...doc, type: doc.type || 'Informe' }));
            functions.logger.info(`  [${baseName}] Found ${detailDocs.length} docs from detail page.`);
        }

        // 2. Get documents from the "Hechos Relevantes".
        const factsForThisIssuer = allFacts.filter(f => getBaseName(f.issuerName) === baseName);
        factsForThisIssuer.forEach(fact => {
            documentsToDownload.push({ title: fact.title, url: fact.url, date: fact.date, type: 'Hecho Relevante' });
        });
        functions.logger.info(`  [${baseName}] Found ${factsForThisIssuer.length} docs from facts list.`);
        
        const finalStoredDocuments = [];

        // 3. Download all documents for this issuer, ONE BY ONE.
        for (const doc of documentsToDownload) {
            if (!doc.url) continue;

            const fileName = path.basename(new URL(doc.url).pathname) || `document_${Date.now()}.pdf`;
            
            // PARANOID CHECK
            if (!baseName || baseName === 'undefined') {
                functions.logger.error(`[FATAL] baseName is invalid JUST BEFORE DOWNLOAD. Skipping file: ${doc.url}`);
                continue;
            }

            const destination = `documents/${baseName}/${fileName}`;
            functions.logger.info(`  [${baseName}] Attempting download: ${doc.url}`);
            
            const publicUrl = await downloadAndStore(doc.url, destination);
            if (publicUrl) {
                finalStoredDocuments.push({
                    title: doc.title,
                    date: doc.date,
                    type: doc.type,
                    url: publicUrl,
                    originalUrl: doc.url,
                });
            }
        }
        
        // 4. Remove duplicates and store everything for this issuer in Firestore.
        const uniqueDocs = Array.from(new Map(finalStoredDocuments.map(doc => [doc.originalUrl, doc])).values());
        functions.logger.info(`  [${baseName}] Storing ${uniqueDocs.length} unique documents to Firestore.`);
        const issuerRef = db.collection("issuers").doc(baseName);
        await issuerRef.set({
            id: baseName,
            name: issuerInfo.name,
            acronym: issuerInfo.acronym,
            sector: issuerInfo.sector,
            documents: uniqueDocs,
        });

        functions.logger.info(`V5: FINISHED processing issuer [${baseName}].`);
    }

    functions.logger.info("V5: SUCCESS. Main loop completed. The process is finished.");
};

module.exports = { scrapeAndStore };
