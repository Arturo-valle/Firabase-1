
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const puppeteer = require("puppeteer-core");
const chromium = require("@sparticuz/chromium");
const cheerio = require("cheerio");

// Especificar el bucket correcto en la inicialización
admin.initializeApp({
  storageBucket: "mvp-nic-market.firebasestorage.app"
});
const storage = admin.storage();

const SIBOIF_URL = "https://www.superintendencia.gob.ni/supervision/intendencia-valores/emisores";

const runtimeOpts = {
  timeoutSeconds: 120,
  memory: "1GB"
};

const scrapeAndStoreIssuers = async () => {
  functions.logger.info("Iniciando el scraping con @sparticuz/chromium...");

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

    functions.logger.info(`Navegando a ${SIBOIF_URL}`);
    await page.goto(SIBOIF_URL, { waitUntil: 'networkidle2' });

    // Selector que estamos depurando
    const selector = "div.article-full-img";

    try {
      functions.logger.info(`Esperando que el selector '${selector}' cargue...`);
      await page.waitForSelector(selector, { timeout: 30000 });
    } catch (e) {
      functions.logger.error(`El selector '${selector}' no apareció. Guardando HTML en Storage...`, e);
      const bodyHTML = await page.evaluate(() => document.body.innerHTML);
      
      const bucket = storage.bucket();
      const file = bucket.file("scraping_error.html");
      await file.save(bodyHTML, { contentType: "text/html" });

      functions.logger.info(`HTML de error guardado en gs://${bucket.name}/scraping_error.html`);

      throw new functions.https.HttpsError("not-found", `El selector '${selector}' no fue encontrado. Se ha guardado un volcado del HTML en Firebase Storage.`, e.message);
    }

    const html = await page.content();
    const $ = cheerio.load(html);

    const profiles = [];
    $(selector).each((i, element) => {
      const profile = {};
      const name = $(element).find("h4 a").text().trim();
      if (name) {
        profile.name = name;
        const logoSrc = $(element).find("img").attr("src");
        if (logoSrc) {
          profile.logoUrl = new URL(logoSrc, SIBOIF_URL).href;
        }
        profiles.push(profile);
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
      return { message: `Scraping exitoso. Se guardaron ${profiles.length} emisores.`, count: profiles.length };
    } 
    
    return { 
      message: "El scraping se completó, pero no se encontraron perfiles con el selector actual.", 
      count: 0
    };

  } catch (error) {
    if (error instanceof functions.https.HttpsError) {
        throw error;
    }
    functions.logger.error("Error durante el scraping con Puppeteer:", error);
    throw new functions.https.HttpsError("internal", "El scraping con Puppeteer falló.", error.message);
  } finally {
    if (browser !== null) {
      await browser.close();
      functions.logger.info("Navegador Puppeteer cerrado.");
    }
  }
};

exports.scrapeNicaraguaIssuers = functions.runWith(runtimeOpts).pubsub.schedule("every 24 hours").onRun(async (context) => {
  try {
    await scrapeAndStoreIssuers();
    return null;
  } catch(error) {
    return null;
  }
});

exports.runScraping = functions.runWith(runtimeOpts).https.onCall(async (data, context) => {
  functions.logger.info("Ejecución manual de scraping iniciada.");
  return await scrapeAndStoreIssuers();
});

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
