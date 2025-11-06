
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const puppeteer = require("puppeteer-core");
const chromium = require("@sparticuz/chromium");
const cheerio = require("cheerio");

// Inicialización de Firebase
admin.initializeApp();

const SIBOIF_URL = "https://www.superintendencia.gob.ni/supervision/intendencia-valores/emisores";

// Opciones de ejecución para las funciones
const runtimeOpts = {
  timeoutSeconds: 120,
  memory: "1GB"
};

// --- FUNCIÓN PRINCIPAL DE SCRAPING DE LA LISTA DE EMISORES ---
const scrapeAndStoreIssuers = async () => {
  functions.logger.info("Iniciando scraping de la lista de emisores...");
  let browser = null;
  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });
    const page = await browser.newPage();
    await page.goto(SIBOIF_URL, { waitUntil: 'networkidle2' });

    const listSelector = "table.views-table tbody tr";
    await page.waitForSelector(listSelector, { timeout: 30000 });
    const html = await page.content();
    const $ = cheerio.load(html);

    const profiles = [];
    $(listSelector).each((i, element) => {
      const name = $(element).find('td.views-field-title a').text().trim();
      const detailUrl = $(element).find('td.views-field-title a').attr('href');
      if (name && detailUrl) {
        const absoluteUrl = new URL(detailUrl, SIBOIF_URL).href;
        profiles.push({ name, detailUrl });
      }
    });

    functions.logger.info(`Se encontraron ${profiles.length} perfiles de emisores.`);
    if (profiles.length > 0) {
      const db = admin.firestore();
      const batch = db.batch();
      profiles.forEach(profile => {
        const docRef = db.collection("NicaraguaIssuers").doc(profile.name);
        batch.set(docRef, { ...profile, scrapedAt: new Date() }, { merge: true });
      });
      await batch.commit();
      functions.logger.info(`${profiles.length} emisores guardados en Firestore.`);
      return { message: `Scraping de lista exitoso. ${profiles.length} emisores guardados.`, count: profiles.length };
    }
    return { message: "Scraping de lista completado, pero no se encontraron perfiles.", count: 0 };
  } catch (error) {
    functions.logger.error("Error crítico durante scraping de la lista de emisores:", error);
    throw new functions.https.HttpsError("internal", "El scraping de la lista de emisores falló.", error.message);
  } finally {
    if (browser) {
      await browser.close();
      functions.logger.info("Navegador (scraping de lista) cerrado.");
    }
  }
};


// --- FUNCIÓN INVOCABLE POR EL CLIENTE (CORREGIDA Y MEJORADA) ---
exports.runScraping = functions.runWith(runtimeOpts).https.onCall(async (data, context) => {
  
  // --- Caso 1: Se pide raspar los documentos de un emisor específico ---
  if (data && data.detailUrl) {
    functions.logger.info(`Iniciando scraping de documentos para: ${data.detailUrl}`);
    let browser = null;
    try {
      browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
        ignoreHTTPSErrors: true,
      });
      const page = await browser.newPage();
      await page.goto(data.detailUrl, { waitUntil: 'networkidle2', timeout: 45000 });

      const documents = await page.evaluate(() => {
        const results = [];
        // Selectores genéricos para encontrar enlaces de documentos en distintas estructuras de página
        const linkSelectors = 'div.content a, div.entry-content a, article a, td a';
        document.querySelectorAll(linkSelectors).forEach(anchor => {
          const href = anchor.href;
          const text = anchor.innerText.trim();
          // Filtro para enlaces que parezcan documentos relevantes
          const keywords = ['.pdf', '.doc', '.zip', 'hechos-relevantes', 'estados-financieros'];
          if (href && text && keywords.some(key => href.toLowerCase().includes(key))) {
            results.push({ url: href, text: text });
          }
        });
        return results;
      });

      functions.logger.info(`Scraping de documentos exitoso. Se encontraron ${documents.length} documentos.`);
      return documents; // Devuelve la lista de documentos al cliente

    } catch (error) {
      functions.logger.error(`FALLO el scraping de documentos para ${data.detailUrl}:`, error.message);
      // *** ESTA ES LA CORRECCIÓN CRÍTICA ***
      // En caso de fallo, devolvemos un array vacío.
      // Esto evita que el servidor se congele y permite al cliente manejar el resultado.
      return [];
    } finally {
      if (browser) {
        await browser.close();
        functions.logger.info("Navegador (scraping de detalles) cerrado.");
      }
    }
  }

  // --- Caso 2: Se pide re-generar la lista completa de emisores ---
  functions.logger.info("Iniciando ejecución manual de scraping de la lista de emisores.");
  return await scrapeAndStoreIssuers();
});


// --- OTRAS FUNCIONES (sin cambios) ---

// Función programada que se ejecuta cada 24 horas
exports.scrapeNicaraguaIssuers = functions.runWith(runtimeOpts).pubsub.schedule("every 24 hours").onRun(scrapeAndStoreIssuers);

// Función para obtener los datos desde la app cliente
exports.getNicaraguaIssuers = functions.https.onCall(async (data, context) => {
  try {
    const db = admin.firestore();
    const snapshot = await db.collection("NicaraguaIssuers").get();
    const issuers = snapshot.docs.map(doc => doc.data());
    return { issuers };
  } catch (error) {
    functions.logger.error("Error al obtener los emisores:", error);
    throw new functions.https.HttpsError("internal", "No se pudo obtener la lista de emisores.");
  }
});
