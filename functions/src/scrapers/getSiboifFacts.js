const axios = require("axios");
const cheerio = require("cheerio");
const https = require('https');

const SIBOIF_URL = "https://www.siboif.gob.ni/supervision/intendencia-valores/hechos-relevantes";

// Create an HTTPS agent that ignores self-signed certificates
const agent = new https.Agent({
  rejectUnauthorized: false
});

/**
 * Normalizes a string by converting to lower case and removing diacritics.
 * @param {string} str The string to normalize.
 * @returns {string} The normalized string.
 */
function normalizeString(str) {
  if (!str) return "";
  return str.toLowerCase().normalize("NFD").replace(/[^\w\s]/gi, '');
}

/**
 * Scrapes relevant facts (Hechos Relevantes) from the SIBOIF website.
 * @param {string} issuerName The name of the issuer to filter by.
 * @returns {Promise<Array<{title: string, url: string, date: string, type: string}>>} A promise that resolves to an array of fact objects.
 */
async function scrapeSiboifFacts(issuerName) {
  try {
    const { data } = await axios.get(SIBOIF_URL, { httpsAgent: agent });
    const $ = cheerio.load(data);
    const facts = [];

    const normalizedIssuerName = normalizeString(issuerName);

    $('table.table-condensed tbody tr.accordion-toggle').each((index, element) => {
      const tds = $(element).find("td");
      const rowIssuerName = $(tds[3]).text().trim();
      const normalizedRowIssuerName = normalizeString(rowIssuerName);

      // Check if the normalized name from the page is a substring of the normalized name we are looking for
      if (normalizedRowIssuerName && normalizedIssuerName.includes(normalizedRowIssuerName)) {
        const title = $(tds[1]).text().trim();
        const date = $(tds[2]).find('span.date-display-single').text().trim();
        const detailRow = $(element).next('tr');
        const url = detailRow.find('div.accordian-body a').attr('href');

        if (title && url && date) {
            facts.push({
                title,
                url: url.startsWith('http') ? url : `https://www.siboif.gob.ni${url}`,
                date,
                type: "Hecho Relevante"
            });
        }
      }
    });

    return facts;

  } catch (error) {
    console.error(`Error scraping SIBOIF facts for ${issuerName}:`, error.message);
    return [];
  }
}

module.exports = { scrapeSiboifFacts };