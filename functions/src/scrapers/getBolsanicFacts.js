
const axios = require("axios");
const cheerio = require("cheerio");
const functions = require("firebase-functions");

const BOLSANC_FACTS_URL = "https://www.bolsanic.com/hechos-relevantes/";

/**
 * Scrapes all "Hechos Relevantes" from BOLSANC, with improved logic to extract the issuer name.
 * @returns {Promise<Array<{title: string, url: string, date: string, issuerName: string, type: string}>>}
 */
async function scrapeBolsanicFacts() {
  functions.logger.info("Scraping Hechos Relevantes from BOLSANC with improved issuer parsing...");
  try {
    const { data } = await axios.get(BOLSANC_FACTS_URL, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const $ = cheerio.load(data);
    const facts = [];

    $("div.et_pb_toggle_content table.tableHR tbody tr").each((_, element) => {
      const columns = $(element).find("td");
      if (columns.length < 3) return;

      const date = columns.eq(0).text().trim();
      const linkElement = columns.eq(2).find("a");
      const url = linkElement.attr("href");
      const fullText = linkElement.text().trim();

      if (date && url && fullText) {
        let issuerName = "";
        let title = "";

        // Improved logic to find the issuer name by splitting on various delimiters.
        const delimiters = ["-", "–", ":"];
        let bestSeparatorIndex = -1;

        for (const delimiter of delimiters) {
          const index = fullText.indexOf(delimiter);
          if (index !== -1) {
            bestSeparatorIndex = index;
            break;
          }
        }

        if (bestSeparatorIndex > 0) {
          issuerName = fullText.substring(0, bestSeparatorIndex).trim();
          title = fullText.substring(bestSeparatorIndex + 1).trim();
        } else {
          // If no clear delimiter is found, we can't reliably determine the issuer.
          functions.logger.warn(`Could not determine issuer for fact: "${fullText}"`);
          title = fullText; // Assign the whole text as title
          issuerName = "Desconocido"; // Mark as unknown
        }

        // Further clean the extracted issuer name for better matching later.
        issuerName = issuerName
          .replace(/, S\.A\.?$/i, "")
          .replace(/\(EMISOR\)$/i, "")
          .replace(/\/.*$/, "") // Remove text after a slash, e.g., "Fondo... / INVERCASA SAFI"
          .trim();

        facts.push({
          title,
          url,
          date,
          issuerName,
          type: "Hecho Relevante",
        });
      }
    });

    if (facts.length === 0) {
      functions.logger.warn("Scraping Hechos Relevantes finished, but no facts were found. Layout may have changed.");
    } else {
      functions.logger.info(`Scraped ${facts.length} Hechos Relevantes. Issuer parsing improved.`);
    }

    return facts;

  } catch (error) {
    functions.logger.error("Fatal error during scrapeBolsanicFacts:", error);
    return [];
  }
}

module.exports = { scrapeBolsanicFacts };
