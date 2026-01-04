/**
 * Normalizes an issuer name to create a consistent ID.
 * - Removes common suffixes like ", S.A."
 * - Removes content in parentheses, e.g., "(Banpro)"
 * - Trims whitespace
 * @param {string} name The original issuer name.
 * @returns {string} The normalized name.
 */
function normalizeIssuerName(name) {
    if (!name) return "";
    return name
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase()
        .replace(/, s\.a\./gi, '')
        .replace(/, s\.a/gi, '')
        .replace(/\s*\(.*?\)/g, '')
        .replace(/[^\w\s]/gi, '') // Remove all punctuation
        .replace(/\s+/g, ' ') // Collapse spaces
        .trim();
}

module.exports = { normalizeIssuerName };
