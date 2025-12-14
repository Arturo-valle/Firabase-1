const fs = require('fs');

// Cargar datos crudos
const rawData = fs.readFileSync('issuers_list.json', 'utf8');
// El archivo tiene múltiples objetos JSON separados por saltos de línea, no es un array válido directamente.
// Necesitamos parsearlo línea por línea.
const data = JSON.parse(rawData);
const issuers = data.issuers || [];

console.log(`Total emisores cargados: ${issuers.length}`);

// Lógica de filtrado (copiada de marketDataApi.ts)
const RECENCY_CUTOFF_DATE = new Date('2023-01-01');
const EXCLUDED_ISSUER_IDS = ['bvn', 'bcr', 'central de valores', 'bolsa de valores'];

const parseDocumentDate = (dateStr) => {
    if (!dateStr) return null;
    try {
        // Handle "DD/MM/YYYY" format
        const parts = dateStr.split(' ')[0].split('/');
        if (parts.length === 3) {
            const [day, month, year] = parts;
            return new Date(`${year}-${month}-${day}`);
        }
        // Fallback
        const date = new Date(dateStr);
        return isNaN(date.getTime()) ? null : date;
    } catch (e) {
        return null;
    }
};

console.log('\n--- Iniciando Depuración de Filtros ---\n');

const filteredIssuers = issuers.filter(issuer => {
    const hasDocs = issuer.documents && issuer.documents.length > 0;
    if (!hasDocs) {
        // console.log(`[RECHAZADO] ${issuer.name}: Sin documentos`);
        return false;
    }

    // Check blacklist
    const normalizedId = issuer.id ? issuer.id.toLowerCase() : '';
    const normalizedName = issuer.name ? issuer.name.toLowerCase() : '';
    const isExcluded = EXCLUDED_ISSUER_IDS.some(id =>
        normalizedId.includes(id) || normalizedName.includes(id)
    );

    if (isExcluded) {
        console.log(`[RECHAZADO - BLACKLIST] ${issuer.name} (ID: ${issuer.id})`);
        return false;
    }

    // Check for recency
    const hasRecentDocs = issuer.documents.some(doc => {
        const docDate = parseDocumentDate(doc.date);
        const isRecent = docDate && docDate >= RECENCY_CUTOFF_DATE;
        // if (issuer.id.includes('banpro') && isRecent) {
        //      console.log(`   -> Doc reciente encontrado para Banpro: ${doc.date} (${docDate.toISOString()})`);
        // }
        return isRecent;
    });

    if (!hasRecentDocs) {
        const lastDoc = issuer.documents[0]; // Asumiendo ordenados, o tomar cualquiera
        console.log(`[RECHAZADO - ANTIGUO] ${issuer.name} (Último doc: ${lastDoc ? lastDoc.date : 'N/A'})`);
        return false;
    }

    console.log(`[ACEPTADO] ${issuer.name}`);
    return true;
});

console.log(`\nTotal emisores después de filtrar: ${filteredIssuers.length}`);
console.log('Emisores aceptados:', filteredIssuers.map(i => i.name));
