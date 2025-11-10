
const axios = require("axios");
const cheerio = require("cheerio");
const functions = require("firebase-functions");

/**
 * Scrapes all financial documents for a single issuer from their BOLSANC detail page.
 * This version is updated to handle the new accordion-style layout.
 * @param {string} detailUrl The URL of the issuer's detail page.
 * @returns {Promise<Array<{title: string, url: string, date: string, type: string}>>} A promise that resolves to an array of document objects.
 */
async function scrapeBolsanicDocuments(detailUrl) {
  if (!detailUrl || !detailUrl.startsWith("http")) {
    functions.logger.warn(`Invalid detailUrl for scrapeBolsanicDocuments: ${detailUrl}`);
    return [];
  }

  try {
    const { data } = await axios.get(detailUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const $ = cheerio.load(data);
    const documents = [];

    // The new layout uses accordion toggles for document categories.
    $("div.et_pb_toggle").each((_, toggleElement) => {
      const category = $(toggleElement).find('h5.et_pb_toggle_title').text().trim();
      const content = $(toggleElement).find('div.et_pb_toggle_content');

      // Find all links that open the PDF viewer.
      content.find('a.lsa-open').each((_, linkElement) => {
        const url = $(linkElement).attr('data-url');
        const title = $(linkElement).find('span.texto').text().trim();
        
        // The date is not available in this new layout.
        const date = ''; 
        
        if (title && url) {
          documents.push({
            title,
            url,
            date,
            type: category || 'Documentos Generales',
          });
        }
      });
    });
    
    if (documents.length === 0) {
        functions.logger.warn(`No documents found for ${detailUrl}. The layout might have changed again or the page has no documents.`);
    } else {
        functions.logger.info(`Successfully scraped ${documents.length} documents for issuer at ${detailUrl}`);
    }

    return documents;

  } catch (error) {
    functions.logger.error(`Error scraping BOLSANC documents from ${detailUrl}:`, error.message);
    return [];
  }
}

module.exports = { scrapeBolsanicDocuments };
