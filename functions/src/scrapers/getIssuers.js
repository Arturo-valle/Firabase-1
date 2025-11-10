
const axios = require("axios");
const cheerio = require("cheerio");
const functions = require("firebase-functions");

const BOLSANC_ISSUERS_URL = "https://www.bolsanic.com/empresas-en-bolsa/";

/**
 * Scrapes the list of all issuers (private and international) from the main Bolsa de Valores page.
 * @returns {Promise<Array<{name: string, acronym: string, sector: string, detailUrl: string}>>}
 */
async function scrapeIssuers() {
  functions.logger.info("Scraping issuer list from BOLSANC with updated selectors...");
  try {
    const { data } = await axios.get(BOLSANC_ISSUERS_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    const $ = cheerio.load(data);
    const issuers = [];
    const processedUrls = new Set(); // Use a Set to prevent duplicate issuers

    // 1. Scrape Private Issuers from the 'blurb' sections
    $("div.et_pb_blurb").each((_, element) => {
      const linkElement = $(element).find("h4.et_pb_module_header a");
      const detailUrl = linkElement.attr("href");
      const name = linkElement.text().trim();

      if (name && detailUrl && !processedUrls.has(detailUrl)) {
        issuers.push({
          name: name.replace(/, S\.A\./i, "").replace(/\(EMISOR\)/i, "").trim(),
          acronym: "", // Acronym will be scraped from the detail page
          sector: "Privado",
          detailUrl: detailUrl,
        });
        processedUrls.add(detailUrl);
      }
    });

    // 2. Scrape International Issuers from the table
    $("div.et_pb_code_0 table tbody tr").each((_, element) => {
      const linkElement = $(element).find('td[data-label="Sociedad Administradora"] a');
      const detailUrlRelative = linkElement.attr("href");
      const name = linkElement.text().trim();

      if (name && detailUrlRelative) {
        const absoluteUrl = new URL(detailUrlRelative, BOLSANC_ISSUERS_URL).href;
        if (!processedUrls.has(absoluteUrl)) {
          issuers.push({
            name: name.replace(/, S\.A\./i, "").replace(/sociedad administradora de fondos de inversi(o|ó)n/i, "").trim(),
            acronym: "", // Acronym will be scraped later
            sector: "Internacional",
            detailUrl: absoluteUrl,
          });
          processedUrls.add(absoluteUrl);
        }
      }
    });

    if (issuers.length === 0) {
      functions.logger.warn("Scraping issuers from BOLSANC finished, but no issuers were found. The site layout may have changed again.");
    } else {
      functions.logger.info(`Successfully scraped ${issuers.length} issuers from BOLSANC.`);
    }

    return issuers;

  } catch (error) {
    functions.logger.error("Fatal error during scrapeIssuers from BOLSANC:", error);
    return [];
  }
}

module.exports = { scrapeIssuers };
