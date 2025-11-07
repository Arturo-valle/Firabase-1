
const axios = require("axios");
const cheerio = require("cheerio");

/**
 * Scrapes all financial documents for a single issuer from their BOLSANC detail page,
 * respecting the categories defined in the page's tabs.
 * @param {string} detailUrl The URL of the issuer's detail page.
 * @returns {Promise<Array<{title: string, url: string, date: string, type: string}>>} A promise that resolves to an array of document objects.
 */
async function scrapeBolsanicDocuments(detailUrl) {
  if (!detailUrl || !detailUrl.startsWith("http")) {
    console.warn(`Invalid detailUrl for scrapeBolsanicDocuments: ${detailUrl}`);
    return [];
  }

  try {
    const { data } = await axios.get(detailUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const $ = cheerio.load(data);

    const documents = [];
    const tabsContainer = $('div[data-widget_type="tabs.default"]');

    // Get all tab titles to use as categories
    const tabTitles = [];
    tabsContainer.find('.elementor-tab-title').each((_, element) => {
      tabTitles.push($(element).text().trim());
    });

    // Iterate over each tab content panel
    tabsContainer.find('.elementor-tab-content').each((tabIndex, contentElement) => {
      const category = tabTitles[tabIndex] || 'Documentos Generales'; // Fallback category
      
      // Find all links within the current tab content
      $(contentElement).find('a').each((_, linkElement) => {
        const url = $(linkElement).attr('href');
        const title = $(linkElement).text().trim();
        
        // Date is not reliably available, so we keep it empty.
        const date = ''; 
        
        if (title && url) {
          documents.push({
            title,
            url,
            date,
            type: category, // Use the category from the tab title
          });
        }
      });
    });
    
    if (documents.length === 0) {
        console.log(`No documents found via new tab scraper for ${detailUrl}. Check layout.`);
    }

    return documents;

  } catch (error) {
    console.error(`Error scraping BOLSANC documents from ${detailUrl}:`, error.message);
    // Return an empty array on error to avoid breaking the entire process
    return [];
  }
}

module.exports = { scrapeBolsanicDocuments };
