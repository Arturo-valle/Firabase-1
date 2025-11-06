
const axios = require("axios");
const cheerio = require("cheerio");

/**
 * Realiza scraping de la URL de detalle de un emisor para obtener sus documentos.
 * @param {string} detailUrl La URL de la página de detalle del emisor.
 * @returns {Promise<any[]>} Una promesa que se resuelve con la lista de documentos.
 */
async function scrapeIssuerDocuments(detailUrl) {
  try {
    if (!detailUrl) {
      throw new Error("La URL de detalle es requerida.");
    }

    const { data } = await axios.get(detailUrl, { timeout: 30000 }); // Añadir timeout
    const $ = cheerio.load(data);
    const documents = [];

    // Selector más específico y robusto
    $("div.view-relevantes table.views-table tbody tr").each((i, row) => {
      const docAnchor = $(row).find("td.views-field-field-documento-relevante a");
      
      const text = docAnchor.text().trim();
      const url = docAnchor.attr("href");

      if (text && url) {
        documents.push({ text, url });
      }
    });

    return documents;
  } catch (error) {
    console.error(`Error durante el scraping de documentos de ${detailUrl}:`, error);
    // Devolver un array vacío en caso de error para no bloquear la app
    return [];
  }
}

module.exports = { scrapeIssuerDocuments };
