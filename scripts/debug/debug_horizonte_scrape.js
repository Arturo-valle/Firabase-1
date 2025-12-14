const axios = require('axios');
const cheerio = require('cheerio');

const TARGET_URL = 'https://www.bolsanic.com/emisor-horizontefondodeinversion/';

async function debugScrape() {
    console.log(`\nDebug Scrape for: ${TARGET_URL}`);

    try {
        const { data } = await axios.get(TARGET_URL, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
        });

        const $ = cheerio.load(data);
        console.log("Page Title:", $('title').text().trim());

        // Check Method 1: .lsa-open
        const lsaLinks = $(".lsa-open");
        console.log(`\nSelector .lsa-open count: ${lsaLinks.length}`);
        lsaLinks.each((i, el) => {
            console.log(` - [${i}] Text: ${$(el).text().trim()} | URL: ${$(el).attr('data-url') || $(el).attr('href')}`);
        });

        // Check Method 2: Legacy Button
        const legacyLinks = $("a.btn.btn-primary.btn-sm.w-100.mb-2");
        console.log(`\nSelector a.btn.btn-primary.btn-sm.w-100.mb-2 count: ${legacyLinks.length}`);
        legacyLinks.each((i, el) => {
            console.log(` - [${i}] Text: ${$(el).text().trim()} | URL: ${$(el).attr('href')}`);
        });

        // Check for ANY links to PDF
        const pdfLinks = $("a[href$='.pdf']");
        console.log(`\nGeneric .pdf link count: ${pdfLinks.length}`);
        pdfLinks.each((i, el) => {
            if (i < 5) console.log(` - [${i}] ${$(el).attr('href')}`);
        });

    } catch (e) {
        console.error("Scrape failed:", e.message);
    }
}

debugScrape();
