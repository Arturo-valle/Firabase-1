
const axios = require("axios");
const cheerio = require("cheerio");

/**
 * Scrapes financial documents for a single issuer from their new BOLSANC detail page.
 * @param {string} detailUrl The URL of the issuer's detail page.
 * @returns {Promise<Array<{title: string, url: string, date: string, type: string}>>} A promise that resolves to an array of document objects.
 */
async function scrapeBolsanicDocuments(detailUrl) {
  if (!detailUrl || !detailUrl.startsWith("http")) {
    console.warn(`Invalid detailUrl provided to scrapeBolsanicDocuments: ${detailUrl}`);
    return [];
  }

  try {
    const { data } = await axios.get(detailUrl);
    const $ = cheerio.load(data);

    const documents = [];

    // The new layout uses Elementor tabs. The documents are in widgets.
    $('div[data-widget_type="tabs.default"]').find('div.elementor-widget-container').first().find('a').each((index, element) => {
        const url = $(element).attr('href');
        const title = $(element).text().trim();
        
        // The date is not available in a structured way, so we leave it empty for now
        const date = ''; 
        
        if(title && url) {
            documents.push({
                title,
                url,
                date, 
                type: "Información Financiera" // General type for now
            });
        }
    });

    return documents;

  } catch (error) {
    console.error(`Error scraping BOLSANC documents from ${detailUrl}:`, error.message);
    return [];
  }
}

module.exports = { scrapeBolsanicDocuments };
