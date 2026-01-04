
const axios = require("axios");
const cheerio = require("cheerio");
const functions = require("firebase-functions");

// This is the new, correct URL for the BCN exchange rate page.
const BCN_RATES_URL = "https://www.bcn.gob.ni/es/estadisticas/indicadores-economicos/tipo-de-cambio";

/**
 * Scrapes the official exchange rate from the Central Bank of Nicaragua (BCN).
 * @returns {Promise<number|null>} A promise that resolves to the exchange rate, or null if scraping fails.
 */
const scrapeBcnExchangeRate = async () => {
  try {
    functions.logger.info("Scraping BCN for official exchange rate...");
    // The BCN site sometimes blocks requests without a user-agent.
    const { data } = await axios.get(BCN_RATES_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const $ = cheerio.load(data);

    // This new selector targets the main display box with the exchange rate.
    // It is more robust than the previous table-based selector.
    const rateText = $('div.kpi-value').text().trim();

    const rate = parseFloat(rateText);

    if (!rateText || isNaN(rate)) {
      functions.logger.error("Could not find or parse the exchange rate from the new BCN URL. The layout may have changed again.");
      return null;
    }

    functions.logger.info(`Successfully scraped BCN exchange rate: ${rate}`);
    return rate;

  } catch (error) {
    functions.logger.error(`Error scraping BCN exchange rate: ${error.message}`);
    return null;
  }
};

const scrapeBcnRates = async () => {
  const rate = await scrapeBcnExchangeRate();
  if (rate) {
    const admin = require('firebase-admin');
    const db = admin.firestore();
    await db.collection('system').doc('market_metadata').set({
      exchangeRate: rate,
      lastRateUpdate: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    functions.logger.info(`Saved BCN rate ${rate} to system/market_metadata`);
  }
  return rate;
};

module.exports = { scrapeBcnExchangeRate, scrapeBcnRates };
