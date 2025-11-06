const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeBolsanicDocuments(detailUrl) {
  try {
    const { data } = await axios.get(detailUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36'
      }
    });

    const $ = cheerio.load(data);
    const documents = [];

    $('.et_pb_toggle').each((i, toggle) => {
      const category = $(toggle).find('.et_pb_toggle_title').text().trim();
      $(toggle).find('.et_pb_toggle_content .lsa-open').each((j, link) => {
        const docTitle = $(link).find('.texto').text().trim();
        const docUrl = $(link).data('url');

        if (docTitle && docUrl) {
          documents.push({
            category: category,
            title: docTitle,
            url: docUrl
          });
        }
      });
    });

    return documents;
  } catch (error) {
    console.error(`Error scraping documents from ${detailUrl}:`, error);
    return [];
  }
}

module.exports = { scrapeBolsanicDocuments };
