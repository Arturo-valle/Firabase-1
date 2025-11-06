const functions = require("firebase-functions");
const { scrapeIssuers } = require("./src/getIssuers");
const { scrapeIssuerDocuments } = require("./src/getIssuerDocuments");

/**
 * Cloud Function para obtener la lista de emisores.
 */
exports.getIssuers = functions
  .runWith({ memory: '1GB', timeoutSeconds: 120 })
  .https.onCall(async (data, context) => {
    functions.logger.info("Solicitud recibida para getIssuers");
    try {
      const issuers = await scrapeIssuers();
      return { issuers };
    } catch (error) {
      throw error;
    }
  });

/**
 * Cloud Function para obtener los documentos de un emisor específico.
 */
exports.getIssuerDocuments = functions
  .runWith({ memory: '1GB', timeoutSeconds: 120 })
  .https.onCall(async (data, context) => {
    const { detailUrl } = data;
    if (!detailUrl) {
      throw new functions.https.HttpsError('invalid-argument', 'La función debe ser llamada con un argumento "detailUrl".');
    }

    functions.logger.info(`Solicitud recibida para getIssuerDocuments con URL: ${detailUrl}`);
    
    try {
      const documents = await scrapeIssuerDocuments(detailUrl);
      return { documents };
    } catch (error) {
      throw error;
    }
  });
