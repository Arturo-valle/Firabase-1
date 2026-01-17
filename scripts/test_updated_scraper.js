const axios = require('axios');
const cheerio = require('cheerio');

// Mock firebase functions
global.functions = {
    logger: {
        info: console.log,
        error: console.error
    }
};

const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function (path) {
    if (path === 'firebase-functions') {
        return global.functions;
    }
    return originalRequire.apply(this, arguments);
};

const { scrapeBolsanicDocuments } = require('../functions/src/scrapers/getBolsanicDocuments.js');

async function test() {
    const url = 'https://www.bolsanic.com/emisor-corporacionesagricolas/';
    console.log(`Testing scraper on: ${url}`);

    const docs = await scrapeBolsanicDocuments(url);

    console.log(`\nFound ${docs.length} documents.`);
    if (docs.length === 0) {
        console.log("❌ No documents found!");
        return;
    }

    // Sort by date descending
    docs.sort((a, b) => new Date(b.date) - new Date(a.date));

    console.log("\n--- Top 10 Most Recent Documents ---");
    docs.slice(0, 10).forEach(d => {
        console.log(`[${d.date.substring(0, 10)}] ${d.title}`);
        console.log(`   URL: ${d.url.substring(0, 60)}...`);
    });

    const recentDocs = docs.filter(d => new Date(d.date).getFullYear() >= 2021);
    console.log(`\nFound ${recentDocs.length} documents from 2021 or later.`);
}

test();
