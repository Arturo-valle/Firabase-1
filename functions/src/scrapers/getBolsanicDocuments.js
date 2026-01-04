
const functions = require("firebase-functions");
const axios = require("axios");
const cheerio = require("cheerio");

/**
 * Scrapes the individual document links from an issuer's detail page.
 * This function ONLY extracts the URLs and metadata. It does NOT download files.
 * @param {string} detailUrl The URL of the issuer's detail page.
 * @returns {Promise<Array<{title: string, url: string, date: string, type: string}>>}
 */
const scrapeBolsanicDocuments = async (detailUrl) => {
    if (!detailUrl) {
        return [];
    }

    try {
        const { data } = await axios.get(detailUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
        });
        const $ = cheerio.load(data);
        const documents = [];

        // --- HANDLER: INVERCA SAFI (Wordpress) ---
        if (detailUrl.includes('invercasasafi.com')) {
            $("a[href*='.pdf']").each((i, element) => {
                const url = $(element).attr('href');
                const title = $(element).text().trim() || url.split('/').pop();

                // Filter: Only Horizonte related docs if strictly needed, or all docs on page 
                // Since URL is specifically /fondos-de-inversion/, it might have multiple funds.
                // We should check if the section header or title mentions "Horizonte" if strict filtering needed.
                // For now, accept all PDFs and let extraction filter by content relevance.

                // Infer Data directly from WordPress URL structure: .../2025/07/...
                let date = new Date().toISOString();
                const urlMatch = url.match(/\/(\d{4})\/(\d{2})\//);
                if (urlMatch) {
                    const year = urlMatch[1];
                    const month = urlMatch[2];
                    date = new Date(`${year}-${month}-01`).toISOString();
                } else {
                    // Fallback to title date extraction
                    const yearMatch = title.match(/20\d{2}/);
                    if (yearMatch) date = new Date(`${yearMatch[0]}-01-01`).toISOString();
                }

                let type = "Documento";
                if (/prospecto/i.test(title)) type = "Prospecto";
                else if (/financiero|auditado|informe/i.test(title)) type = "Estados Financieros";
                else if (/riesgo|calificaci/i.test(title)) type = "Calificación de Riesgo";
                else if (/hecho relevante/i.test(title)) type = "Hecho Relevante";
                else if (/trimestral/i.test(title)) type = "Informe Trimestral";

                if (url) {
                    documents.push({
                        title: title.replace(/\s+/g, ' '),
                        url,
                        date,
                        type
                    });
                }
            });

            return documents;
        }

        // --- HANDLER: BOLSANIC (Legacy & New) ---
        // Method 1: Look for .lsa-open links (New structure)
        $(".lsa-open").each((i, element) => {
            const title = $(element).text().trim();
            let url = $(element).attr('data-url') || $(element).attr('href');

            // Clean up URL if needed (sometimes it might be relative or obfuscated?)
            // data-url usually has full URL: https://www.bolsanic.com/?lsa_pdf_id=...

            if (url && url !== '#' && title) {
                // Infer type and date from title since table structure might be missing
                let type = "Documento";
                if (/prospecto/i.test(title)) type = "Prospecto";
                else if (/financiero|auditados|ef |eeff/i.test(title)) type = "Estados Financieros";
                else if (/hecho relevante/i.test(title)) type = "Hecho Relevante";
                else if (/calificaci/i.test(title)) type = "Calificación de Riesgo";

                // Attempt to find date in title (e.g., "DIC 2024", "20/10/2023")
                // If not found, default to null or current date? 
                // Better to leave empty if unknown, but indexFinancials needs a date for recent check.
                // We'll try to find a year at least.
                let date = new Date().toISOString();
                const yearMatch = title.match(/20\d{2}/);
                if (yearMatch) {
                    // Default to Jan 1st of that year if no month found
                    date = new Date(`${yearMatch[0]}-01-01`).toISOString();

                    // Try to find month
                    const monthMatch = title.match(/ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic/i);
                    if (monthMatch) {
                        const months = {
                            ene: '01', feb: '02', mar: '03', abr: '04', may: '05', jun: '06',
                            jul: '07', ago: '08', sep: '09', oct: '10', nov: '11', dic: '12'
                        };
                        const m = months[monthMatch[0].toLowerCase().substring(0, 3)];
                        date = new Date(`${yearMatch[0]}-${m}-01`).toISOString(); // "2024-12-01"
                    }
                }

                documents.push({ title, url, date, type });
            }
        });

        // Method 2: Fallback to old selector if no docs found (Backwards compatibility)
        if (documents.length === 0) {
            $("a.btn.btn-primary.btn-sm.w-100.mb-2").each((i, element) => {
                const title = $(element).text().trim();
                const url = $(element).attr('href');
                const tableRow = $(element).closest("tr");
                const dateText = tableRow.find("td").eq(0).text().trim();
                const typeText = tableRow.find("td").eq(1).text().trim();

                if (url) {
                    documents.push({
                        title,
                        url,
                        date: dateText || new Date().toISOString(),
                        type: typeText || "Documento"
                    });
                }
            });
        }

        return documents;
    } catch (error) {
        functions.logger.error(`Error scraping document URLs from ${detailUrl}:`, error);
        return [];
    }
};

module.exports = { scrapeBolsanicDocuments };
