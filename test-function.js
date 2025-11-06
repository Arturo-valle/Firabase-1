
const { initializeApp } = require("firebase/app");
const { getFunctions, httpsCallable } = require("firebase/functions");

// IMPORTANT: Replace with your actual project configuration
const firebaseConfig = {
  projectId: "mvp-nic-market",
  // You might need other config fields if you have authentication, etc.
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const functions = getFunctions(app, "us-central1");

// Point to the local emulator
const { connectFunctionsEmulator } = require("firebase/functions");
connectFunctionsEmulator(functions, "127.0.0.1", 5001);

const runTest = async () => {
  try {
    // 1. Test fetching the list of all issuers
    console.log("--- TEST 1: Fetching all issuers ---");
    const getIssuers = httpsCallable(functions, 'getNicaraguaIssuers');
    const issuerResult = await getIssuers();
    console.log(`Successfully fetched ${issuerResult.data.issuers.length} issuers.`);
    // console.log(JSON.stringify(issuerResult.data, null, 2));


    // 2. Test fetching documents for a specific issuer
    console.log("\n--- TEST 2: Fetching documents for a specific issuer ---");
    const issuerToTest = "Bolsa de Valores de Nicaragua"; // Using a known issuer
    console.log(`Requesting documents for: ${issuerToTest}`);

    const runScraping = httpsCallable(functions, 'runScraping');
    const documentsResult = await runScraping({ issuerName: issuerToTest });
    
    if (documentsResult.data.length > 0) {
      console.log(`Success! Found ${documentsResult.data.length} documents for ${issuerToTest}.`);
      console.log("Sample document:", JSON.stringify(documentsResult.data[0], null, 2));
    } else {
      console.warn(`Warning: No documents were found for ${issuerToTest}. The function works, but there may be no data on the source website.`);
    }
    
    process.exit(0);

  } catch (error) {
    console.error("\n--- TEST FAILED ---");
    console.error("Error Code:", error.code);
    console.error("Error Message:", error.message);
    console.error("Error Details:", error.details);
    process.exit(1);
  }
};

runTest();
