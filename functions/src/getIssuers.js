const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeIssuers() {
  const url = 'https://www.bolsanic.com/empresas-en-bolsa/';
  try {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);
    const issuers = [];

    // Select the specific row that contains the lists of active issuers
    $('.et_pb_row_1 .et_pb_text_inner ul li a').each((i, element) => {
      const name = $(element).text().trim();
      const detailUrl = $(element).attr('href');

      if (name && detailUrl) {
        issuers.push({
          name: name,
          // Ensure the URL is absolute
          detailUrl: detailUrl.startsWith('http') ? detailUrl : `https://www.bolsanic.com${detailUrl}`
        });
      }
    });

    return issuers;
  } catch (error) {
    console.error('Error scraping issuers from Bolsanic:', error);
    // Return an empty array or throw the error, depending on desired error handling
    return [];
  }
}

module.exports = { scrapeIssuers };
