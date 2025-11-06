
const axios = require("axios");
const cheerio = require("cheerio");

const URL_EMISORES = "https://www.superintendencia.gob.ni/instituciones-supervisadas-siboif/puesto-de-bolsa";

/**
 * Realiza scraping de la URL de la SIBOIF para obtener la lista de emisores.
 * @returns {Promise<any[]>} Una promesa que se resuelve con la lista de emisores.
 */
async function scrapeIssuers() {
  try {
    const { data } = await axios.get(URL_EMISORES);
    const $ = cheerio.load(data);
    const issuers = [];

    $("div.view-content table.views-table tbody tr").each((i, row) => {
      const nameAnchor = $(row).find("td.views-field-title a");
      const name = nameAnchor.text().trim();
      const detailUrl = nameAnchor.attr("href");
      
      // Manejo robusto de campos que pueden estar vacíos
      const acronym = $(row).find("td.views-field-field-siglas").text().trim() || '';
      const sector = $(row).find("td.views-field-field-sector").text().trim() || 'No especificado';
      const description = $(row).find("td.views-field-field-descripcion").text().trim() || 'Descripción no disponible.';

      if (name && detailUrl) {
        issuers.push({
          name,
          acronym,
          description,
          sector: sector || 'Público', // Asume Público si está vacío
          detailUrl: `https://www.superintendencia.gob.ni${detailUrl}`,
        });
      }
    });

    return issuers;
  } catch (error) {
    console.error("Error durante el scraping de emisores:", error);
    // En lugar de lanzar el error, devolvemos un array vacío para no romper el frontend.
    return [];
  }
}

module.exports = { scrapeIssuers };
