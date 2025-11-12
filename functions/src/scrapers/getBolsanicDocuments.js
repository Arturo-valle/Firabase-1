
const axios = require("axios");
const cheerio = require("cheerio");
const functions = require("firebase-functions");
const { getStorage } = require("firebase-admin/storage");
const path = require("path");

/**
 * Downloads a file from a URL and uploads it to Firebase Storage.
 * @param {string} url The URL of the file to download.
 * @param {string} destinationPath The path in the Storage bucket to upload the file to.
 * @returns {Promise<string>} The public URL of the uploaded file.
 */
async function downloadAndStore(url, destinationPath) {
  try {
    const bucket = getStorage().bucket();
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const file = bucket.file(destinationPath);
    await file.save(response.data);
    await file.makePublic();
    return file.publicUrl();
  } catch (error) {
    functions.logger.error(`Failed to download and store file from ${url}`, error);
    return null; // Return null if the process fails
  }
}

/**
 * Scrapes all financial documents for a single issuer from their BOLSANC detail page.
 * This version downloads the documents and stores them in Firebase Storage.
 * @param {string} detailUrl The URL of the issuer's detail page.
 * @param {string} issuerId A unique ID for the issuer (e.g., base name) to create a folder path.
 * @returns {Promise<Array<{title: string, url: string, date: string, type: string}>>} An array of document objects with storage URLs.
 */
async function scrapeBolsanicDocuments(detailUrl, issuerId) {
  if (!detailUrl || !detailUrl.startsWith("http")) {
    functions.logger.warn(`Invalid detailUrl for scrapeBolsanicDocuments: ${detailUrl}`);
    return [];
  }

  try {
    const { data } = await axios.get(detailUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const $ = cheerio.load(data);
    const documentPromises = [];

    $("div.et_pb_toggle").each((_, toggleElement) => {
      const category = $(toggleElement).find('h5.et_pb_toggle_title').text().trim();
      const content = $(toggleElement).find('div.et_pb_toggle_content');

      content.find('a.lsa-open').each((_, linkElement) => {
        const originalUrl = $(linkElement).attr('data-url');
        const title = $(linkElement).find('span.texto').text().trim();
        const date = ''; 

        if (title && originalUrl) {
          const fileName = path.basename(new URL(originalUrl).pathname);
          const destinationPath = `documents/${issuerId}/${fileName}`;
          
          const promise = downloadAndStore(originalUrl, destinationPath).then(storageUrl => {
            if (storageUrl) {
              return {
                title,
                url: storageUrl, // <-- The new URL from Firebase Storage
                originalUrl: originalUrl, // <-- Keep the original for reference
                date,
                type: category || 'Documentos Generales',
              };
            }
            return null;
          });
          documentPromises.push(promise);
        }
      });
    });
    
    const documents = (await Promise.all(documentPromises)).filter(doc => doc !== null);

    if (documents.length === 0) {
        functions.logger.warn(`No documents found for ${detailUrl}.`);
    } else {
        functions.logger.info(`Successfully processed and stored ${documents.length} documents for issuer at ${detailUrl}`);
    }

    return documents;

  } catch (error) {
    functions.logger.error(`Error scraping BOLSANC documents from ${detailUrl}:`, error.message);
    return [];
  }
}

module.exports = { scrapeBolsanicDocuments };
