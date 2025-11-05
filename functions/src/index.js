const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");
const cheerio = require("cheerio");

admin.initializeApp();

const db = admin.firestore();

/**
 * Genera un slug a partir de un texto.
 * @param {string} text Texto a convertir.
 * @return {string} Slug generado.
 */
const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, "-")       // Reemplaza espacios con -
    .replace(/[^\w\-]+/g, "")   // Elimina caracteres no alfanuméricos
    .replace(/\-\-+/g, "-")     // Reemplaza múltiples - con uno solo
    .replace(/^-+/, "")          // Elimina - del inicio
    .replace(/-+$/, "");         // Elimina - del final
};

/**
 * Cloud Function que se ejecuta diariamente para buscar nuevos emisores
 * en el sitio de la Superintendencia de Nicaragua.
 */
exports.scrapeNicaraguaIssuers = functions.pubsub
  .schedule("every 24 hours")
  .onRun(async (context) => {
    const sourceUrl = "https://www.superintendencia.gob.ni/supervision/intendencia-valores/emisores";

    try {
      const response = await axios.get(sourceUrl);
      const $ = cheerio.load(response.data);

      const issuerLinks = [];
      $("a").each((index, element) => {
        const href = $(element).attr("href");
        const name = $(element).text().trim();

        // Filtrar enlaces que parecen ser de emisores
        if (href && href.includes("perfil-del-emisor")) {
          issuerLinks.push({
            name,
            sourceUrl: `https://www.superintendencia.gob.ni${href}`,
          });
        }
      });

      if (issuerLinks.length === 0) {
        console.log("No se encontraron enlaces de emisores.");
        return null;
      }

      console.log(`Se encontraron ${issuerLinks.length} enlaces de emisores.`);

      // Procesar cada enlace de emisor
      const promises = issuerLinks.map(async (issuer) => {
        const issuerId = slugify(issuer.name);
        const issuerRef = db.collection("issuers").doc(issuerId);
        const doc = await issuerRef.get();

        if (!doc.exists) {
          console.log(`Nuevo emisor encontrado: ${issuer.name}`);
          await issuerRef.set({
            name: issuer.name,
            country: "Nicaragua",
            sourceUrl: issuer.sourceUrl,
            lastScraped: null, // Se establece cuando se escanean los documentos
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        } else {
          console.log(`El emisor ${issuer.name} ya existe.`);
        }
      });

      await Promise.all(promises);
      console.log("Proceso de scraping de emisores completado exitosamente.");
      return null;

    } catch (error) {
      console.error("Error durante el scraping de emisores:", error);
      return null;
    }
  });
