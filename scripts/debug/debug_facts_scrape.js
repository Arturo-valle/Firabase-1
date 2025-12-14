const axios = require("axios");
const cheerio = require("cheerio");

const BOLSANC_FACTS_URL = "https://www.bolsanic.com/hechos-relevantes/";

async function debugFacts() {
    console.log("Scraping Hechos Relevantes...");
    try {
        const { data } = await axios.get(BOLSANC_FACTS_URL, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const $ = cheerio.load(data);
        const facts = [];

        $("div.et_pb_toggle_content table.tableHR tbody tr").each((_, element) => {
            const columns = $(element).find("td");
            if (columns.length < 3) return;

            const date = columns.eq(0).text().trim();
            const linkElement = columns.eq(2).find("a");
            const fullText = linkElement.text().trim();

            if (date && fullText) {
                let issuerName = "";
                let title = "";

                const delimiters = ["-", "–", ":"];
                let bestSeparatorIndex = -1;

                for (const delimiter of delimiters) {
                    const index = fullText.indexOf(delimiter);
                    if (index !== -1) {
                        bestSeparatorIndex = index;
                        break;
                    }
                }

                if (bestSeparatorIndex > 0) {
                    issuerName = fullText.substring(0, bestSeparatorIndex).trim();
                    title = fullText.substring(bestSeparatorIndex + 1).trim();
                } else {
                    title = fullText;
                    issuerName = "Desconocido";
                }

                // Mimic the real scraper cleaning
                issuerName = issuerName
                    .replace(/, S\.A\.?$/i, "")
                    .replace(/\(EMISOR\)$/i, "")
                    .replace(/\/.*$/, "")
                    .trim();

                facts.push({ issuerName, title, fullText });
            }
        });

        console.log(`\nTotal Facts Found: ${facts.length}`);

        // Filter for Horizonte
        const horizonteFacts = facts.filter(f =>
            f.issuerName.toLowerCase().includes('horizonte') ||
            f.fullText.toLowerCase().includes('horizonte')
        );

        console.log(`\nHorizonte Facts Found: ${horizonteFacts.length}`);
        horizonteFacts.forEach((f, i) => {
            console.log(` [${i}] Issuer: '${f.issuerName}' | Title: '${f.title}'`);
        });

    } catch (e) {
        console.error(e);
    }
}

debugFacts();
