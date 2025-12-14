
const axios = require("axios");
const cheerio = require("cheerio");

async function debugScrape() {
    // URL for FID (Known Good)
    const url = "https://www.bolsanic.com/emisor-bdf/";
    console.log(`Scraping URL: ${url} `);

    try {
        const { data } = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const $ = cheerio.load(data);

        console.log("Page Title:", $("title").text());

        // DUMP HTML
        const fs = require('fs');
        fs.writeFileSync('bdf_page.html', $.html());
        console.log("Dumped HTML to bdf_page.html");

        let foundDocs = 0;
        console.log("\n--- Checking for .lsa-open (Method 1) ---");
        $(".lsa-open").each((i, element) => {
            console.log(`[${i}]Text: ${$(element).text().trim()} | URL: ${$(element).attr('data-url') || $(element).attr('href')} `);
            foundDocs++;
        });

        if (foundDocs === 0) {
            console.log("No .lsa-open links found.");
            console.log("\n--- Checking for fallback buttons (Method 2) ---");
            $("a.btn").each((i, element) => {
                console.log(`[${i}]Text: ${$(element).text().trim()} | URL: ${$(element).attr('href')} `);
            });
        }
    } catch (error) {
        console.error("Error scraping:", error.message);
    }
}

debugScrape();
