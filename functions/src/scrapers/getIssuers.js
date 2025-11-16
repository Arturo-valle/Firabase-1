
const axios = require("axios");
const cheerio = require("cheerio");
const functions = require("firebase-functions");

const BOLSANC_ISSUERS_URL = "https://www.bolsanic.com/empresas-en-bolsa/";

async function scrapeAcronymFromDetailPage(detailUrl) {
    try {
        const { data } = await axios.get(detailUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const $ = cheerio.load(data);
        const selectors = ["div.et_pb_text_inner h2", "h1.entry-title", "strong"];
        for (const selector of selectors) {
            const elements = $(selector);
            for (let i = 0; i < elements.length; i++) {
                const text = elements.eq(i).text().trim();
                const textWithoutSpaces = text.replace(/\s+/g, '');
                if (textWithoutSpaces && textWithoutSpaces.length > 2 && textWithoutSpaces.length < 20 && textWithoutSpaces.toUpperCase() === textWithoutSpaces) {
                    return textWithoutSpaces;
                }
            }
        }
        return "";
    } catch (error) {
        return "";
    }
}

async function scrapeIssuers() {
    functions.logger.info("Scraping issuer list dynamically...");
    try {
        const { data } = await axios.get(BOLSANC_ISSUERS_URL, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const $ = cheerio.load(data);
        const issuers = [];
        const processedUrls = new Set();
        const issuersNeedingDetailScrape = [];

        $("div.et_pb_blurb").each((_, element) => {
            const linkElement = $(element).find("h4.et_pb_module_header a");
            const detailUrl = linkElement.attr("href");
            const nameText = linkElement.text().trim();
            if (nameText && detailUrl && !processedUrls.has(detailUrl)) {
                let name = nameText, acronym = "";
                const acronymMatch = nameText.match(/\(([^)]+)\)/);
                if (acronymMatch && acronymMatch[1]) {
                    acronym = acronymMatch[1];
                    name = nameText.replace(/\(([^)]+)\)/, '').trim();
                }
                name = name.replace(/, S\.A\./i, "").replace(/\(EMISOR\)/i, "").trim();
                const issuer = { name, acronym, sector: "Privado", detailUrl };
                if (!acronym) issuersNeedingDetailScrape.push(issuer);
                else issuers.push(issuer);
                processedUrls.add(detailUrl);
            }
        });

        $("div.et_pb_code_0 table tbody tr").each((_, element) => {
            const linkElement = $(element).find('td[data-label="Sociedad Administradora"] a');
            const detailUrlRelative = linkElement.attr("href");
            const nameText = linkElement.text().trim();
            if (nameText && detailUrlRelative) {
                const absoluteUrl = new URL(detailUrlRelative, BOLSANC_ISSUERS_URL).href;
                if (!processedUrls.has(absoluteUrl)) {
                    const name = nameText.replace(/, S\.A\./i, "").replace(/sociedad administradora de fondos de inversi(o|ó)n/i, "").trim();
                    issuersNeedingDetailScrape.push({ name, acronym: "", sector: "Internacional", detailUrl: absoluteUrl });
                    processedUrls.add(absoluteUrl);
                }
            }
        });

        $("div.et_pb_text_11 div.et_pb_text_inner ul li").each((_, element) => {
            const name = $(element).text().trim().replace(/, S\.A\./i, "").trim();
            if (name) issuers.push({ name, acronym: "", sector: "Inactivo", detailUrl: null });
        });

        if (issuersNeedingDetailScrape.length > 0) {
            const detailedIssuerPromises = issuersNeedingDetailScrape.map(issuer =>
                scrapeAcronymFromDetailPage(issuer.detailUrl).then(acronym => ({ ...issuer, acronym: acronym || "" }))
            );
            issuers.push(...await Promise.all(detailedIssuerPromises));
        }

        functions.logger.info(`Successfully scraped ${issuers.length} total issuers.`);
        return issuers;
    } catch (error) {
        functions.logger.error("Fatal error during scrapeIssuers:", error);
        return [];
    }
}

module.exports = { scrapeIssuers };
