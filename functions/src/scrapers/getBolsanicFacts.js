
const axios = require("axios");
const cheerio = require("cheerio");
const functions = require("firebase-functions");

const BOLSANC_FACTS_URL = "https://www.bolsanic.com/hechos-relevantes/";

/**
 * Scrapes all "Hechos Relevantes" from the Bolsa de Valores de Nicaragua using the updated accordion structure.
 * @returns {Promise<Array<{title: string, url: string, date: string, issuerName: string, type: string}>>}
 */
async function scrapeBolsanicFacts() {
  functions.logger.info("Scraping Hechos Relevantes from BOLSANC with new selectors...");
  try {
    const { data } = await axios.get(BOLSANC_FACTS_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    const $ = cheerio.load(data);
    const facts = [];

    // The new structure uses accordions for each year. We iterate through all tables within them.
    $("div.et_pb_toggle_content table.tableHR tbody tr").each((_, element) => {
      const columns = $(element).find("td");

      // Skip header rows or rows that don't have the expected number of columns.
      if (columns.length < 3) {
        return;
      }

      const date = columns.eq(0).text().trim();
      const linkElement = columns.eq(2).find("a");
      const url = linkElement.attr("href");
      const fullText = linkElement.text().trim();

      if (date && url && fullText) {
        let issuerName = "";
        let title = "";
        const separatorIndex = fullText.indexOf("-");

        if (separatorIndex > 0) {
          issuerName = fullText.substring(0, separatorIndex).trim();
          title = fullText.substring(separatorIndex + 1).trim();
        } else {
          // If no separator is found, log it and use the full text as the title.
          functions.logger.warn(`Could not determine issuer for fact: "${fullText}"`);
          title = fullText;
        }
        
        // Clean up common suffixes from the issuer name for better matching.
        issuerName = issuerName.replace(/, S\.A\.$/i, "").replace(/\(EMISOR\)$/i, "").trim();

        if (title && url) {
          facts.push({
            title,
            url,
            date,
            issuerName,
            type: "Hecho Relevante",
          });
        }
      }
    });

    if (facts.length === 0) {
      functions.logger.warn("Scraping Hechos Relevantes from BOLSANC finished, but no facts were found. The layout may have changed again.");
    } else {
      functions.logger.info(`Successfully scraped ${facts.length} Hechos Relevantes from BOLSANC.`);
    }

    return facts;

  } catch (error) {
    functions.logger.error("Fatal error during scrapeBolsanicFacts:", error);
    return [];
  }
}

module.exports = { scrapeBolsanicFacts };
