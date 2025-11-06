const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeIssuers() {
  const url = 'https://www.bolsanic.com/empresas-en-bolsa/';
  try {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);
    const issuers = [];

    // Use a more robust selector to find the list of issuers
    $('.entry-content ul li a').each((i, element) => {
      const name = $(element).text().trim();
      const detailUrl = $(element).attr('href');

      // Basic validation to ensure we're adding valid issuer data
      if (name && detailUrl && !detailUrl.includes('mailto:')) {
        issuers.push({
          name: name,
          // Ensure the URL is absolute
          detailUrl: detailUrl.startsWith('http') ? detailUrl : `https://www.bolsanic.com${detailUrl}`
        });
      }
    });

    if (issuers.length === 0) {
      console.warn("Cheerio selector found 0 issuers. The website structure might have changed.");
    }

    return issuers;
  } catch (error) {
    console.error('Error scraping issuers from Bolsanic:', error);
    return [];
  }
}

module.exports = { scrapeIssuers };
