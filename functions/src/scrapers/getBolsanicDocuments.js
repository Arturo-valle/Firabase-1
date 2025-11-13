
const functions = require("firebase-functions");
const axios = require("axios");
const cheerio = require("cheerio");

/**
 * Scrapes the individual document links from an issuer's detail page.
 * This function ONLY extracts the URLs and metadata. It does NOT download files.
 * @param {string} detailUrl The URL of the issuer's detail page.
 * @returns {Promise<Array<{title: string, url: string, date: string, type: string}>>}
 */
const scrapeBolsanicDocuments = async (detailUrl) => {
    if (!detailUrl) {
        return [];
    }

    try {
        const { data } = await axios.get(detailUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
        });
        const $ = cheerio.load(data);
        const documents = [];

        $("a.btn.btn-primary.btn-sm.w-100.mb-2").each((i, element) => {
            const title = $(element).text().trim();
            const url = $(element).attr('href');

            // Extract date and type from the table row
            const tableRow = $(element).closest("tr");
            const date = tableRow.find("td").eq(0).text().trim();
            const type = tableRow.find("td").eq(1).text().trim();

            if (url) {
                documents.push({ title, url, date, type });
            }
        });

        return documents;
    } catch (error) {
        functions.logger.error(`Error scraping document URLs from ${detailUrl}:`, error);
        return []; // Return an empty array on error, no file downloads here.
    }
};

module.exports = { scrapeBolsanicDocuments };
