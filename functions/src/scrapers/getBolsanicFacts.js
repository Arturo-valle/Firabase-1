
const axios = require("axios");
const cheerio = require("cheerio");
const functions = require("firebase-functions");

const BOLSANC_FACTS_URL = "https://www.bolsanic.com/hechos-relevantes/";

const { findIssuerId } = require("../utils/issuerConfig");

/**
 * Scrapes all "Hechos Relevantes" from BOLSANC, with improved logic to extract the issuer name.
 * @returns {Promise<Array<{title: string, url: string, date: string, issuerName: string, type: string}>>}
 */
async function scrapeBolsanicFacts() {
  functions.logger.info("Scraping Hechos Relevantes from BOLSANC with fuzzy issuer matching...");
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
        let rawIssuerName = "";
        let title = "";

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
          rawIssuerName = fullText.substring(0, bestSeparatorIndex).trim();
          title = fullText.substring(bestSeparatorIndex + 1).trim();
        } else {
          title = fullText;
          rawIssuerName = "Desconocido";
        }

        // Clean extracted name
        const cleanName = rawIssuerName
          .replace(/, S\.A\.?$/i, "")
          .replace(/\(EMISOR\)$/i, "")
          .replace(/\/.*$/, "")
          .trim();

        // FUZZY MATCHING using centralized logic
        const issuerId = findIssuerId(cleanName) || "desconocido";

        facts.push({
          title,
          url,
          date,
          issuerName: cleanName,
          issuerId, // NEW: Canonical ID
          fullText,
          type: "Hecho Relevante",
        });
      }
    });

    if (facts.length === 0) {
      functions.logger.warn("Scraping Hechos Relevantes finished, but no facts were found.");
    } else {
      functions.logger.info(`Scraped ${facts.length} Hechos Relevantes with fuzzy IDs.`);
    }

    return facts;

  } catch (error) {
    functions.logger.error("Fatal error during scrapeBolsanicFacts:", error);
    return [];
  }
}

module.exports = { scrapeBolsanicFacts };
