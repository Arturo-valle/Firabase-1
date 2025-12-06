
const { getFirestore } = require("firebase-admin/firestore");
const functions = require("firebase-functions");
const { getStorage } = require("firebase-admin/storage");
const axios = require("axios");
const path = require("path");
const { scrapeIssuers } = require("../scrapers/getIssuers");
const { scrapeBolsanicDocuments } = require("../scrapers/getBolsanicDocuments");
const { scrapeBolsanicFacts } = require("../scrapers/getBolsanicFacts");
const { scrapeBcnExchangeRate } = require("../scrapers/getBcnRates");
const { issuers: staticIssuers } = require("../data/issuers");

const getBaseName = (issuerOrName) => {
    if (typeof issuerOrName === 'object' && issuerOrName.acronym) {
        return issuerOrName.acronym.toLowerCase();
    }
    const name = typeof issuerOrName === 'string' ? issuerOrName : issuerOrName.name;
    if (!name) return "unknown_issuer";

    // Normalize: remove accents, lowercase, remove common suffixes
    return name.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .split(',')[0].split('(')[0].trim()
        .replace(/\s+/g, '_');
};

const findBestIssuerMatch = (fact, issuers) => {
    const normalizedText = fact.fullText.toLowerCase();
    let potentialMatches = [];

    for (const issuer of issuers) {
        const terms = [issuer.name.toLowerCase(), ...(issuer.variations || [])];
        if (issuer.acronym) terms.push(issuer.acronym.toLowerCase());

        for (const term of terms) {
            const index = normalizedText.indexOf(term);
            if (index !== -1) {
                const score = term === issuer.acronym?.toLowerCase() ? 100 : 90;
                potentialMatches.push({ issuer, score, index });
            }
        }
    }

    if (potentialMatches.length === 0) {
        return null;
    }

    // Ordenar por la posición en el texto (más bajo es mejor)
    potentialMatches.sort((a, b) => a.index - b.index);

    // Devolver el emisor que aparece primero en el texto
    return potentialMatches[0].issuer;
};

async function downloadAndStore(url, destinationPath) {
    if (!url || !url.startsWith("http")) return null;
    try {
        const bucket = getStorage().bucket();
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        const file = bucket.file(destinationPath);
        await file.save(response.data, { resumable: false });
        await file.makePublic();
        return file.publicUrl();
    } catch (error) {
        return null;
    }
}

const scrapeAndStore = async () => {
    const db = getFirestore();

    const snapshot = await db.collection("issuers").get();
    if (snapshot.size > 0) {
        const batch = db.batch();
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
    }

    const results = await Promise.allSettled([
        scrapeIssuers(),
        scrapeBolsanicFacts(),
        scrapeBcnExchangeRate(),
    ]);

    const dynamicIssuers = results[0].status === 'fulfilled' ? results[0].value : [];
    if (results[0].status === 'rejected') functions.logger.error("Error scraping issuers:", results[0].reason);

    const rawFacts = results[1].status === 'fulfilled' ? results[1].value : [];
    if (results[1].status === 'rejected') functions.logger.error("Error scraping facts:", results[1].reason);

    const exchangeRate = results[2].status === 'fulfilled' ? results[2].value : null;
    if (results[2].status === 'rejected') functions.logger.error("Error scraping exchange rate:", results[2].reason);

    // Merge dynamic and static issuers
    const issuerMap = new Map();
    [...staticIssuers, ...dynamicIssuers].forEach(issuer => {
        const baseName = getBaseName(issuer);
        if (!issuerMap.has(baseName)) {
            issuerMap.set(baseName, issuer);
        }
    });
    const issuers = Array.from(issuerMap.values());

    const documentsByIssuer = new Map();
    rawFacts.forEach(fact => {
        const matchedIssuer = findBestIssuerMatch(fact, issuers);
        if (matchedIssuer) {
            const baseName = getBaseName(matchedIssuer);
            if (!documentsByIssuer.has(baseName)) {
                documentsByIssuer.set(baseName, []);
            }
            documentsByIssuer.get(baseName).push({
                title: fact.title, url: fact.url, date: fact.date, type: 'Hecho Relevante',
            });
        }
    });

    for (const issuer of issuers) {
        const baseName = getBaseName(issuer);
        let documentsToStore = documentsByIssuer.get(baseName) || [];

        if (issuer.detailUrl) {
            const detailDocs = await scrapeBolsanicDocuments(issuer.detailUrl);
            documentsToStore.push(...detailDocs.map(doc => ({ ...doc, type: doc.type || 'Informe' })));
        }

        if (documentsToStore.length > 0) {
            const finalStoredDocuments = [];
            for (const doc of documentsToStore) {
                const fileName = doc.url ? path.basename(new URL(doc.url, "https://www.bolsanic.com").pathname) : `doc_${Date.now()}`;
                const destination = `documents/${baseName}/${fileName}`;
                const publicUrl = await downloadAndStore(doc.url, destination);
                if (publicUrl) {
                    finalStoredDocuments.push({
                        title: doc.title, date: doc.date, type: doc.type,
                        url: publicUrl, originalUrl: doc.url,
                    });
                }
            }

            if (finalStoredDocuments.length > 0) {
                const uniqueDocs = Array.from(new Map(finalStoredDocuments.map(doc => [doc.originalUrl, doc])).values());
                await db.collection("issuers").doc(baseName).set({
                    id: baseName, name: issuer.name, acronym: issuer.acronym,
                    sector: issuer.sector, documents: uniqueDocs,
                });
            } else {
                // Save issuer even if document download failed, but with empty docs
                await db.collection("issuers").doc(baseName).set({
                    id: baseName, name: issuer.name, acronym: issuer.acronym,
                    sector: issuer.sector, documents: [],
                });
            }
        } else {
            // Save issuer even if no documents found
            await db.collection("issuers").doc(baseName).set({
                id: baseName, name: issuer.name, acronym: issuer.acronym,
                sector: issuer.sector, documents: [],
            });
        }
    }

    if (exchangeRate) {
        await db.collection("bcn").doc("exchangeRate").set({ rate: exchangeRate, lastUpdated: new Date() });
    }
};

module.exports = { scrapeAndStore, downloadAndStore };
