const axios = require('axios');
const cheerio = require('cheerio');

async function verify() {
    const url = 'https://www.bolsanic.com/emisor-corporacionesagricolas/';
    console.log(`Fetching ${url}...`);

    try {
        const { data } = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
        });

        const $ = cheerio.load(data);
        const lsaLinks = $(".lsa-open");

        console.log(`\nFound ${lsaLinks.length} elements with class .lsa-open`);

        if (lsaLinks.length > 0) {
            console.log("✅ Links ARE visible to Axios/Cheerio.");

            // Verify one URL
            const firstLink = lsaLinks.eq(0);
            const testUrl = firstLink.attr('data-url');
            if (testUrl && testUrl.startsWith('http')) {
                console.log(`\nTesting PDF URL: ${testUrl}`);
                try {
                    const resp = await axios.head(testUrl, {
                        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
                        maxRedirects: 5
                    });
                    console.log(`Status: ${resp.status}`);
                    console.log(`Content-Type: ${resp.headers['content-type']}`);
                    if (resp.headers['content-type'] && resp.headers['content-type'].includes('application/pdf')) {
                        console.log("✅ URL points directly to a PDF.");
                    } else {
                        console.log("⚠️ URL does NOT point to a PDF. Might be a viewer page.");
                    }
                } catch (err) {
                    console.error("Error checking PDF URL:", err.message);
                }
            }

        } else {
            console.log("❌ Links are NOT visible. They might be rendered via JavaScript.");
        }
    } catch (e) {
        console.error("Error fetching URL:", e.message);
    }
}

verify();
