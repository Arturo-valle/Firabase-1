
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { extractIssuerMetrics } = require("../services/metricsExtractor");

if (admin.apps.length === 0) {
    admin.initializeApp();
}
const db = admin.firestore();

const regenerateMetrics = async (req, res) => {
    try {
        console.log("Starting Metrics Regeneration...");

        const activeIds = [
            "banco-de-la-producci-n",
            "banpro",
            "banco-de-finanzas",
            "bdf",
            "fama",
            "financiera-fama",
            "corporaci-n-agricola",
            "agricorp",
            "financiera-fdl",
            "fid-sociedad-an-nima",
            "fid-s-a",
            "horizonte-fondo-de-inversi-n-financiero-de-crecimiento-d-lares-no-diversificado",
            "horizonte-fondo-de-inversion",
            "agri-corp"
        ];

        const results = [];

        for (const issuerId of activeIds) {
            // Check if issuer has chunks (to avoid errors)
            const chunkSnap = await db.collection("documentChunks").where("issuerId", "==", issuerId).limit(1).get();
            if (chunkSnap.empty) {
                console.log(`Skipping ${issuerId} (no chunks)`);
                continue;
            }

            console.log(`Regenerating metrics for ${issuerId}...`);
            try {
                // We need a name. Fetch from issuer doc or use ID
                let name = issuerId;
                const issuerDoc = await db.collection("issuers").doc(issuerId).get();
                if (issuerDoc.exists) name = issuerDoc.data().name;

                const result = await extractIssuerMetrics(issuerId, name);
                results.push({ issuerId, success: true });
            } catch (e) {
                console.error(`Failed to regenerate ${issuerId}:`, e);
                results.push({ issuerId, success: false, error: e.message });
            }
        }

        res.json({ success: true, results });

    } catch (error) {
        console.error("Regeneration Error:", error);
        res.status(500).send(error.message);
    }
};

module.exports = regenerateMetrics;
