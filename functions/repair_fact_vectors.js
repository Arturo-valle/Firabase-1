
const admin = require('firebase-admin');
const { execSync } = require('child_process');

async function run() {
    try {
        console.log('Fetching access token from gcloud...');
        const token = execSync('gcloud auth print-access-token').toString().trim();

        admin.initializeApp({
            projectId: 'mvp-nic-market',
            credential: {
                getAccessToken: () => Promise.resolve({ access_token: token, expires_in: 3600 })
            }
        });

        const db = admin.firestore();
        const factCollection = db.collection('fact_vectors');
        const snapshot = await factCollection.get();

        console.log(`Analyzing ${snapshot.size} documents in fact_vectors...`);

        const issuers = ["agricorp", "banpro", "bdf", "fama", "fdl", "fid", "horizonte", "agri-corp"];
        const batch = db.batch();
        let count = 0;

        snapshot.forEach(doc => {
            const data = doc.data();
            const docId = doc.id.toLowerCase();

            if (!data.issuerId) {
                let matchedIssuer = null;
                for (const issuer of issuers) {
                    if (docId.includes(issuer.toLowerCase())) {
                        matchedIssuer = issuer === "agri-corp" ? "agricorp" : issuer;
                        break;
                    }
                }

                if (matchedIssuer) {
                    console.log(`Updating ${doc.id} -> issuerId: ${matchedIssuer}`);
                    batch.update(doc.ref, { issuerId: matchedIssuer });
                    count++;
                } else {
                    console.log(`Could not identify issuer for: ${doc.id}`);
                }
            }
        });

        if (count > 0) {
            console.log(`Committing ${count} updates...`);
            await batch.commit();
            console.log('Repair completed successfully.');
        } else {
            console.log('No documents needed repair.');
        }

    } catch (e) {
        console.error('FATAL_ERROR:', e.message);
    } finally {
        setTimeout(() => process.exit(0), 1000);
    }
}

run();
