const { getFirestore } = require('firebase-admin/firestore');
const admin = require('firebase-admin');

if (admin.apps.length === 0) admin.initializeApp();
const db = getFirestore();

async function auditAgricorp() {
    console.log("=== AGRICORP FORENSIC AUDIT ===");

    // 1. Identify Target Documents (2021-2022)
    // Since we don't have a direct query for date in all chunks efficiently, 
    // let's look at the document titles first via metadata aggregation if possible,
    // or just scan metadata of chunks.

    // 1. Check Total Count (Approx)
    // We can't count all without reading, but let's try a larger limit just for count
    const countSnapshot = await db.collection('documentChunks')
        .where('issuerId', '==', 'agricorp')
        .select('issuerId') // Select minimal field to save bandwidth
        .get();

    console.log(`[FORENSIC] ACTUAL Total Chunks in DB: ${countSnapshot.size}`);

    const chunksSnapshot = await db.collection('documentChunks')
        .where('issuerId', '==', 'agricorp')
        .limit(1000)
        .get();

    console.log(`[FORENSIC] Sample Retrieval (1000) - First ID: ${chunksSnapshot.docs[0].id}`);
    console.log(`[FORENSIC] Sample Retrieval (1000) - Last ID: ${chunksSnapshot.docs[chunksSnapshot.size - 1].id}`);

    const docStats = {};

    chunksSnapshot.forEach(doc => {
        const data = doc.data();
        const title = data.metadata.documentTitle || 'Unknown';
        const date = data.metadata.documentDate; // Check explicitly

        if (!docStats[title]) {
            docStats[title] = { count: 0, date: date, dateType: typeof date, textSample: data.text.substring(0, 100), hasEmbedding: !!data.embedding };
        }
        docStats[title].count++;
    });

    console.log("\n--- Document Inventory ---");
    let targetYearsFound = false;

    Object.keys(docStats).forEach(title => {
        const titleLower = title.toLowerCase();
        if (titleLower.includes('2021') || titleLower.includes('2022')) {
            console.log(`[TARGET] ${title} (${docStats[title].date}) - ${docStats[title].count} chunks`);
            console.log(`   Sample: "${docStats[title].textSample.replace(/\n/g, ' ')}..."`);
            targetYearsFound = true;
        } else {
            console.log(`[OTHER]  ${title} - ${docStats[title].count} chunks`);
        }
    });

    if (!targetYearsFound) {
        console.error("\n[CRITICAL] No documents found for 2021 or 2022 in the sample!");
    } else {
        console.log("\n[INFO] Target documents exist. Checking for specific keywords...");
        // Check for "Utilidad" in target years chunks
        let keywordCount = 0;
        chunksSnapshot.forEach(doc => {
            const data = doc.data();
            const title = (data.metadata.documentTitle || '').toLowerCase();
            if (title.includes('2021') || title.includes('2022')) {
                if (data.text.toLowerCase().includes('utilidad') || data.text.toLowerCase().includes('ganancia')) {
                    keywordCount++;
                    console.log(`   MATCH in ${title}: "...${data.text.substring(data.text.toLowerCase().indexOf('utilidad'), data.text.toLowerCase().indexOf('utilidad') + 50)}..."`);
                }
            }
        });
        console.log(`\nChunks containing 'utilidad'/'ganancia' in 2021/2022 docs: ${keywordCount}`);
    }
}

auditAgricorp().catch(console.error);
