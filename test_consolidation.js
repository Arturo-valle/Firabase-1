const { consolidateIssuers, getBaseName } = require("./functions/src/utils/issuerConsolidation");

const testIssuers = [
    {
        name: "AGRICORP – Aviso de Oferta Pública",
        acronym: "",
        detailUrl: "http://example.com"
    },
    {
        name: "Financiera FDL",
        acronym: "BVN", // Wrong acronym
        detailUrl: "http://example.com"
    }
];

console.log("Testing getBaseName:");
console.log("AGRICORP ->", getBaseName("AGRICORP – Aviso de Oferta Pública"));

console.log("\nTesting consolidateIssuers:");
const consolidated = consolidateIssuers(testIssuers);
console.log(JSON.stringify(consolidated, null, 2));
