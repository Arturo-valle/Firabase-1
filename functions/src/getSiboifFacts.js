const axios = require('axios');
const cheerio = require('cheerio');
const https = require('https');

const URL_HECHOS_RELEVANTES = "https://www.siboif.gob.ni/supervision/intendencia-valores/hechos-relevantes";

// Create an HTTPS agent that ignores self-signed certificates
const agent = new https.Agent({
  rejectUnauthorized: false
});

/**
 * Scrapes the SIBOIF URL to get the relevant facts for a specific issuer.
 * @param {string} issuerName The name of the issuer to filter the documents.
 * @returns {Promise<any[]>} A promise that resolves with the list of relevant facts.
 */
async function scrapeSiboifFacts(issuerName) {
  try {
    if (!issuerName) {
      throw new Error("Issuer name is required.");
    }

    // Use the custom agent to bypass SSL certificate validation
    const { data } = await axios.get(URL_HECHOS_RELEVANTES, { 
      httpsAgent: agent,
      timeout: 30000 
    });
    
    const $ = cheerio.load(data);
    const documents = [];

    $("div.view-hechos-relevantes table.views-table tbody tr").each((i, row) => {
      const emisor = $(row).find("td.views-field-field-emisor").text().trim();
      if (emisor.toLowerCase().includes(issuerName.toLowerCase())) {
        const docAnchor = $(row).find("td.views-field-field-hecho-relevante a");
        const title = docAnchor.text().trim();
        const url = docAnchor.attr("href");

        if (title && url) {
          documents.push({ 
            category: 'Hechos Relevantes',
            title: title, 
            url: url.startsWith('http') ? url : `https://www.siboif.gob.ni${url}`
          });
        }
      }
    });

    return documents;
  } catch (error) {
    console.error(`Error scraping relevant facts for ${issuerName}:`, error);
    // Return an empty array on error to avoid breaking the entire process
    return [];
  }
}

module.exports = { scrapeSiboifFacts };
