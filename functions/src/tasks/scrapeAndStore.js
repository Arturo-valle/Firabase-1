
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

const getBaseName = (name) => {
    if (!name) return "unknown_issuer";
    return name.split(',')[0].split('(')[0].trim().toLowerCase().replace(/\s+/g, '_');
};

const findBestIssuerMatch = (fact, issuers) => {
    const normalizedText = fact.fullText.toLowerCase();
    let bestMatch = null;
    let highestScore = 0;

    for (const issuer of issuers) {
        const terms = [issuer.name.toLowerCase(), ...(issuer.variations || [])];
        if (issuer.acronym) terms.push(issuer.acronym.toLowerCase());

        for (const term of terms) {
            if (normalizedText.includes(term)) {
                const score = term === issuer.acronym?.toLowerCase() ? 100 : 90;
                if (score > highestScore) {
                    highestScore = score;
                    bestMatch = issuer;
                }
            }
        }
    }

    if (!bestMatch || highestScore < 90) {
        return null;
    }
    return bestMatch;
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

    const [dynamicIssuers, rawFacts, exchangeRate] = await Promise.all([
        scrapeIssuers(),
        scrapeBolsanicFacts(),
        scrapeBcnExchangeRate(),
    ]);

    // Merge dynamic and static issuers
    const issuerMap = new Map();
    [...staticIssuers, ...dynamicIssuers].forEach(issuer => {
        const baseName = getBaseName(issuer.name);
        if (!issuerMap.has(baseName)) {
            issuerMap.set(baseName, issuer);
        }
    });
    const issuers = Array.from(issuerMap.values());

    const documentsByIssuer = new Map();
    rawFacts.forEach(fact => {
        const matchedIssuer = findBestIssuerMatch(fact, issuers);
        if (matchedIssuer) {
            const baseName = getBaseName(matchedIssuer.name);
            if (!documentsByIssuer.has(baseName)) {
                documentsByIssuer.set(baseName, []);
            }
            documentsByIssuer.get(baseName).push({
                title: fact.title, url: fact.url, date: fact.date, type: 'Hecho Relevante',
            });
        }
    });

    for (const issuer of issuers) {
        const baseName = getBaseName(issuer.name);
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
            }
        }
    }

    if (exchangeRate) {
        await db.collection("bcn").doc("exchangeRate").set({ rate: exchangeRate, lastUpdated: new Date() });
    }
};

module.exports = { scrapeAndStore };
