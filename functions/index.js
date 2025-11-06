const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");
const cheerio = require("cheerio");

// Inicializamos el SDK de Firebase Admin
admin.initializeApp();

// URL de la página de la Superintendencia de Bancos y de Otras Instituciones Financieras
const SIBOIF_URL = "https://www.siboif.gob.ni/informacion-financiera/bolsa-de-valores/puestos-de-bolsa-autorizados";

/**
 * Cloud Function que se ejecuta una vez al día para buscar emisores de valores en Nicaragua.
 * La función visita la página de la SIBOIF, extrae la lista de emisores y los guarda en Firestore.
 */
exports.scrapeNicaraguaIssuers = functions.pubsub.schedule("every 24 hours").onRun(async (context) => {
  functions.logger.info("Iniciando el scraping de emisores de Nicaragua...");

  try {
    // 1. Obtener el HTML de la página web
    const response = await axios.get(SIBOIF_URL);
    const html = response.data;

    // 2. Analizar el HTML con Cheerio para encontrar la tabla de emisores
    const $ = cheerio.load(html);
    const issuers = [];
    
    // Buscamos la tabla y recorremos cada fila (tr)
    $("table tbody tr").each((i, row) => {
      // Obtenemos la primera celda (td) de la fila, que contiene el nombre del emisor
      const issuerName = $(row).find("td").first().text().trim();
      if (issuerName) {
        issuers.push(issuerName);
      }
    });

    functions.logger.info(`Se encontraron ${issuers.length} emisores.`);

    // 3. Guardar los nuevos emisores en Firestore
    if (issuers.length > 0) {
      const db = admin.firestore();
      const batch = db.batch();

      issuers.forEach(name => {
        // Usamos el nombre del emisor como ID del documento para evitar duplicados
        const docRef = db.collection("NicaraguaIssuers").doc(name);
        batch.set(docRef, { name: name, scrapedAt: new Date() });
      });

      await batch.commit();
      functions.logger.info(`${issuers.length} emisores guardados en Firestore.`);
    }

    return null;
  } catch (error) {
    functions.logger.error("Error durante el scraping:", error);
    return null;
  }
});
