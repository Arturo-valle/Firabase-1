
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

            // Clean up URL: sometimes it's literally just '#'
            if (url === '#') url = null;
            // Fallback: try to find data-url again if not found (sometimes strict 'href' check obscures it if logic above was different)
            if (!url) url = $(element).attr('data-url');

            // Construct full URL if relative
            if (url && !url.startsWith('http')) {
                // Usually these are full URLs, but just in case
                if (url.startsWith('/')) url = `https://www.bolsanic.com${url}`;
            }

            if (url && title) {
                // --- ROBUST DATE PARSING ---
                let date = new Date().toISOString();
                let dateFound = false;
                const cleanTitle = title.replace(/\s+/g, ' ');

                // 1. Full Date with separators (DD/MM/YYYY, DD.MM.YY, etc)
                // Supports 1 or 2 digits for D/M, and 2 or 4 for Year.
                const fullDateMatch = cleanTitle.match(/\b(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})\b/);
                if (fullDateMatch) {
                    let y = parseInt(fullDateMatch[3]);
                    const m = parseInt(fullDateMatch[2]);
                    const d = parseInt(fullDateMatch[1]);

                    if (y < 100) y += 2000; // 24 -> 2024

                    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
                        date = new Date(y, m - 1, d).toISOString();
                        dateFound = true;
                    }
                }

                // 2. Compact Date DDMMYY (e.g. 231024, 220621)
                if (!dateFound) {
                    // Try to match 6 digits that look like a date
                    const compactMatches = cleanTitle.matchAll(/\b(\d{2})(\d{2})(\d{2})\b/g);
                    for (const match of compactMatches) {
                        // Careful: 220621 could be 22/06/21
                        const d = parseInt(match[1]);
                        const m = parseInt(match[2]);
                        const y = parseInt(match[3]);
                        const fullYear = 2000 + y;

                        // Validate logic: DD must be <= 31, MM <= 12
                        if (d >= 1 && d <= 31 && m >= 1 && m <= 12) {
                            date = new Date(fullYear, m - 1, d).toISOString();
                            dateFound = true;
                            break;
                        }
                    }
                }

                // 3. Compact Date DDMMYYYY (e.g. 19122025)
                if (!dateFound) {
                    const ddmmyyyyMatch = cleanTitle.match(/\b(\d{2})(\d{2})(20\d{2})\b/);
                    if (ddmmyyyyMatch) {
                        const d = parseInt(ddmmyyyyMatch[1]);
                        const m = parseInt(ddmmyyyyMatch[2]);
                        const y = parseInt(ddmmyyyyMatch[3]); // Full year captured

                        if (d >= 1 && d <= 31 && m >= 1 && m <= 12) {
                            date = new Date(y, m - 1, d).toISOString();
                            dateFound = true;
                        }
                    }
                }

                // 4. Concat MMYYYY (e.g. 032018, 122023)
                if (!dateFound) {
                    const mmyyyyMatch = cleanTitle.match(/\b(\d{2})(20\d{2})\b/);
                    if (mmyyyyMatch) {
                        const m = parseInt(mmyyyyMatch[1]);
                        const y = parseInt(mmyyyyMatch[2]);
                        if (m >= 1 && m <= 12) {
                            // Assume end of month for reporting
                            date = new Date(y, m - 1, 1).toISOString();
                            dateFound = true;
                        }
                    }
                }

                // 4. Short MMYY (e.g. 1224 -> Dec 2024)
                if (!dateFound) {
                    const mmyyMatch = cleanTitle.match(/\b(\d{2})(\d{2})\b/);
                    if (mmyyMatch) {
                        const m = parseInt(mmyyMatch[1]);
                        const y = parseInt(mmyyMatch[2]);

                        // Strict validation to avoid random numbers
                        // Year between 15 and 30 (2015-2030)
                        // Month 1-12
                        if (m >= 1 && m <= 12 && y >= 15 && y <= 30) {
                            const fullYear = 2000 + y;
                            date = new Date(fullYear, m - 1, 1).toISOString();
                            dateFound = true;
                        }
                    }
                }

                // 5. Textual Month and Year (DIC 2024)
                if (!dateFound) {
                    const yearMatch = cleanTitle.match(/\b20\d{2}\b/);
                    if (yearMatch) {
                        const year = yearMatch[0];
                        let month = '01';
                        let day = '01';

                        const monthMatch = cleanTitle.match(/ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic/i);
                        if (monthMatch) {
                            const months = {
                                ene: '01', feb: '02', mar: '03', abr: '04', may: '05', jun: '06',
                                jul: '07', ago: '08', sep: '09', oct: '10', nov: '11', dic: '12'
                            };
                            month = months[monthMatch[0].toLowerCase().substring(0, 3)];
                        }
                        date = new Date(`${year}-${month}-${day}`).toISOString();
                        dateFound = true;
                    }
                }

                // Infer type
                let type = "Documento";
                const tLower = cleanTitle.toLowerCase();
                if (tLower.includes('prospecto')) type = "Prospecto";
                else if (tLower.includes('financiero') || tLower.includes('auditado') || tLower.includes('ef ') || tLower.includes('eeff')) type = "Estados Financieros";
                else if (tLower.includes('hecho relevante')) type = "Hecho Relevante";
                else if (tLower.includes('calificaci') || tLower.includes('riesgo')) type = "Calificación de Riesgo";
                else if (tLower.includes('trimestral')) type = "Informe Trimestral";

                documents.push({
                    title: cleanTitle,
                    url,
                    date,
                    type
                });
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
