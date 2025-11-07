
const axios = require("axios");
const cheerio = require("cheerio");

const BOLSANC_URL = "https://www.bolsanic.com/empresas-en-bolsa/";

/**
 * Scrapes the list of issuers from the new BOLSANC URL.
 * @returns {Promise<Array<{name: string, detailUrl: string}>>} A promise that resolves to an array of issuer objects.
 */
async function scrapeIssuers() {
  try {
    const { data } = await axios.get(BOLSANC_URL);
    const $ = cheerio.load(data);

    const issuers = [];

    // Find all links within the main content area that point to an issuer page
    $('div#content-area a[href*="/emisor-"]').each((index, element) => {
      const detailUrl = $(element).attr('href');
      const name = $(element).text().trim();
      
      if (name && detailUrl) {
        // Make sure the URL is absolute
        const absoluteUrl = detailUrl.startsWith('http') ? detailUrl : `https://www.bolsanic.com${detailUrl}`;

        // Clean up the name by removing "(EMISOR)" if it exists
        const cleanedName = name.replace(/\(EMISOR\)/i, '').trim();
          
        if (!issuers.some(issuer => issuer.name === cleanedName)) {
            issuers.push({
              name: cleanedName,
              detailUrl: absoluteUrl
            });
        }
      }
    });

    if (issuers.length === 0) {
      console.warn("scrapeIssuers finished but found 0 issuers from the new URL. The website layout may have changed.");
    }

    return issuers;
  } catch (error) {
    console.error("Fatal error during scrapeIssuers with new URL:", error.message);
    return [];
  }
}

module.exports = { scrapeIssuers };
