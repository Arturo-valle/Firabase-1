
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeBolsanicFacts() {
    console.log("Scraping Hechos Relevantes...");
    try {
        const { data } = await axios.get('https://www.bolsanic.com/hechos-relevantes', {
            headers: {
                'User-Agent': 'Mozilla/5.0'
            }
        });
        const $ = cheerio.load(data);
        const facts = [];

        $('.c-feed__item').each((i, el) => {
            const title = $(el).find('.c-feed__item__title').text().trim();
            const date = $(el).find('time').attr('datetime');
            const url = $(el).find('.c-feed__item__action').attr('href');
            const issuerName = $(el).find('.c-feed__item__by').text().trim(); // Ensure this selector is correct

            // Log everything potentially related to Horizonte
            if (
                title.toLowerCase().includes('horizonte') ||
                issuerName.toLowerCase().includes('horizonte')
            ) {
                console.log(`FOUND MATCH:`);
                console.log(` - Title: ${title}`);
                console.log(` - Issuer: ${issuerName}`);
                console.log(` - URL: ${url}`);
                console.log(`-------------------`);
            }

            facts.push({ title, issuerName, url, date });
        });

        console.log(`Total facts found: ${facts.length}`);

    } catch (e) {
        console.error("Error scraping:", e.message);
    }
}

scrapeBolsanicFacts();
