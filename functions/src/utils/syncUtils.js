
const axios = require("axios");
const { getStorage } = require("firebase-admin/storage");
const functions = require("firebase-functions");

/**
 * Persists a document from a URL to Firebase Storage and returns the public URL.
 * @param {string} url - Original document URL
 * @param {string} destinationPath - Path in Storage bucket
 * @returns {Promise<string|null>} Public URL or null if failed
 */
async function downloadAndStore(url, destinationPath) {
    if (!url || !url.startsWith("http")) return null;
    try {
        const bucket = getStorage().bucket();
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 30000, // 30s timeout
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        const file = bucket.file(destinationPath);
        await file.save(response.data, {
            resumable: false,
            metadata: { contentType: 'application/pdf' }
        });

        await file.makePublic();
        return file.publicUrl();
    } catch (error) {
        functions.logger.error(`Error downloading ${url} to ${destinationPath}:`, error.message);
        return null;
    }
}

/**
 * Finds the best matching issuer for a given fact based on whitelist and scores.
 * @param {object} fact - Fact object with fullText
 * @param {Array} issuers - List of issuer objects from configuration
 * @returns {object|null} Matched issuer object or null
 */
const findBestIssuerMatch = (fact, issuers) => {
    if (!fact || !fact.fullText) return null;
    const normalizedText = fact.fullText.toLowerCase();
    let potentialMatches = [];

    for (const issuer of issuers) {
        const terms = [
            issuer.name.toLowerCase(),
            ...(issuer.variations || []).map(v => v.toLowerCase()),
            issuer.acronym?.toLowerCase()
        ].filter(Boolean);

        for (const term of terms) {
            const index = normalizedText.indexOf(term);
            if (index !== -1) {
                // Priority:
                // 1. Exact acronym (100)
                // 2. Name or variation (90)
                // 3. Subtract 50 if sector is "Otro" (prioritizes main issuers)
                let score = term === issuer.acronym?.toLowerCase() ? 100 : 90;
                if (issuer.sector === "Otro") score -= 50;

                potentialMatches.push({ issuer, score, index });
            }
        }
    }

    if (potentialMatches.length === 0) return null;

    // Sort by score (quality) then by first occurrence
    potentialMatches.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.index - b.index;
    });

    return potentialMatches[0].issuer;
};

module.exports = {
    downloadAndStore,
    findBestIssuerMatch
};
