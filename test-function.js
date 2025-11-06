
const { initializeApp } = require("firebase/app");
const { getFunctions, httpsCallable } = require("firebase/functions");

const firebaseConfig = {
  projectId: "mvp-nic-market",
  appId: "1:771683909511:web:2c13d789e525a8c4c3b2e1",
  storageBucket: "mvp-nic-market.appspot.com",
  authDomain: "mvp-nic-market.firebaseapp.com",
  messagingSenderId: "771683909511",
};

const app = initializeApp(firebaseConfig);
const functions = getFunctions(app, "us-central1");

const runScraping = httpsCallable(functions, 'runScraping');

console.log("Iniciando el proceso de scraping manual...");

runScraping()
  .then((result) => {
    console.log("¡Scraping completado!");
    console.log(JSON.stringify(result.data, null, 2));
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error al invocar la función:");
    console.error("Código:", error.code);
    console.error("Mensaje:", error.message);
    // Esta línea nos dará más detalles sobre el error interno de la función
    console.error("Detalles:", error.details);
    process.exit(1);
  });
