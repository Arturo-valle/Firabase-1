
const issuers = [
    // Active Issuers
    { name: "Financiera FDL", acronym: "FDL", sector: "Privado", detailUrl: "https://www.bolsanic.com/emisor-fdl/", variations: ["financiera fdl"] },
    { name: "FID, Sociedad Anónima", acronym: "FID", sector: "Privado", detailUrl: "https://www.bolsanic.com/emisor-fid/", variations: ["fid, s.a"] },
    { name: "Banco De Finanzas", acronym: "BDF", sector: "Privado", detailUrl: "https://www.bolsanic.com/emisor-bancodefinanzas/", variations: ["banco de finanzas"] },
    { name: "Corporación Agricola", acronym: "Agri-Corp", sector: "Privado", detailUrl: "https://www.bolsanic.com/emisor-corporacionesagricolas/", variations: ["agri-corp", "agricorp", "corporación agrícola"] },
    { name: "FAMA", acronym: "FAMA", sector: "Privado", detailUrl: "https://www.bolsanic.com/emisor-financierafama/", variations: ["fama, s.a."] },
    { name: "Banco De La Producción", acronym: "Banpro", sector: "Privado", detailUrl: "https://www.bolsanic.com/emisor-bancodelaproduccion/", variations: ["banpro"] },
    { name: "HORIZONTE FONDO DE INVERSIÓN", acronym: "HORIZONTE", sector: "Privado", detailUrl: "https://www.bolsanic.com/emisor-horizontefondodeinversion/", variations: ["horizonte"] },
    { name: "INVERCASA", acronym: "INVERCASA", sector: "Privado", detailUrl: null, variations: ["invercasa", "invercasasafi"] },

    // Inactive Issuers
    { name: "CREDIFACTOR", acronym: "CREDIFACTOR", sector: "Inactivo", detailUrl: null, variations: ["credifactor"] },
    { name: "FINANCIA CAPITAL", acronym: "FINANCIA", sector: "Inactivo", detailUrl: null, variations: ["financia capital"] },
    { name: "FINANCIERA FUNDESER", acronym: "FUNDESER", sector: "Inactivo", detailUrl: null, variations: ["fundeser"] },
    { name: "FINANCIERA FINCA", acronym: "FINCA", sector: "Inactivo", detailUrl: null, variations: ["finca"] },
    { name: "FACTORING NICARAGUENSE", acronym: "FACTORING", sector: "Inactivo", detailUrl: null, variations: ["factoring"] },
    { name: "BANCO DE AMÉRICA CENTRAL", acronym: "BAC", sector: "Inactivo", detailUrl: null, variations: ["bac"] },
    { name: "BANCO FICOHSA NICARAGUA", acronym: "FICOHSA", sector: "Inactivo", detailUrl: null, variations: ["ficohsa"] },
    { name: "BANCO LAFISE BANCENTRO", acronym: "LAFISE", sector: "Inactivo", detailUrl: null, variations: ["lafise"] },
    { name: "EMPRESA ADMINISTRADORA DE AEROPUERTOS", acronym: "EAAI", sector: "Inactivo", detailUrl: null, variations: ["eaai"] },

    // Other entities
    { name: "BCIE", acronym: "BCIE", sector: "Otro", detailUrl: null, variations: ["bcie"] },
    { name: "DELIPOLLO", acronym: "DELIPOLLO", sector: "Otro", detailUrl: null, variations: ["delipollo"] },
];

module.exports = { issuers };
