const axios = require("axios");
const cheerio = require("cheerio");

const BCN_URL = "https://www.bcn.gob.ni/es/estadisticas/mercado-cambiario/tipo-de-cambio";

/**
 * Scrapes the official exchange rate from the BCN website.
 * @returns {Promise<{buy: number, sell: number, date: string}>} A promise that resolves to an object with buy and sell rates.
 */
async function scrapeBcnRates() {
  try {
    const { data } = await axios.get(BCN_URL);
    const $ = cheerio.load(data);

    // Find the table with the exchange rates
    const table = $('#table-tipo-cambio');
    const firstRow = table.find('tbody tr').first();
    const tds = firstRow.find('td');

    // Extract the buy and sell rates
    const buyRate = parseFloat($(tds[1]).text().trim().replace(/,/g, ''));
    const sellRate = parseFloat($(tds[2]).text().trim().replace(/,/g, ''));
    const date = $(tds[0]).text().trim();

    if (isNaN(buyRate) || isNaN(sellRate)) {
      throw new Error('Could not parse exchange rates.');
    }

    return {
      buy: buyRate,
      sell: sellRate,
      date: date
    };

  } catch (error) {
    console.error(`Error scraping BCN rates:`, error.message);
    // It's better to throw the error to be handled by the caller
    throw new Error(`Failed to scrape BCN rates: ${error.message}`);
  }
}

module.exports = { scrapeBcnRates };