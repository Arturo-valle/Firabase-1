const { getFirestore } = require('firebase-admin/firestore');
const admin = require('firebase-admin');
const { generateEmbeddings, cosineSimilarity } = require('./src/services/vertexAI');

if (admin.apps.length === 0) admin.initializeApp();
const db = getFirestore();

async function simulateSearch() {
    const query = "¿Cuánto ganó Agricorp los últimos cinco años?";
    const issuerId = 'agricorp';

    console.log(`\n=== SIMULATING SEARCH ===`);
    console.log(`Query: "${query}"`);
    console.log(`Issuer: ${issuerId}`);

    // 1. Generate Embedding
    console.log("Generating embedding for query...");
    const queryEmbedding = await generateEmbeddings(query);

    // 2. Fetch ALL chunks for issuer (to perform exact cosine sim locally and visually debug)
    console.log("Fetching chunks for issuer...");
    const chunksSnap = await db.collection('documentChunks')
        .where('issuerId', '==', issuerId)
        .get();

    console.log(`Total chunks for issuer: ${chunksSnap.size}`);

    const scoredChunks = [];
    chunksSnap.forEach(doc => {
        const data = doc.data();
        if (data.embedding) {
            const similarity = cosineSimilarity(queryEmbedding, data.embedding);
            scoredChunks.push({
                similarity,
                title: data.metadata.documentTitle,
                year: data.metadata.documentDate,
                text: data.text.substring(0, 100),
                fullText: data.text
            });
        }
    });

    // 3. Sort and top-k
    scoredChunks.sort((a, b) => b.similarity - a.similarity);
    const top40 = scoredChunks.slice(0, 40);

    console.log("\n=== TOP 40 RESULTS (Simulated) ===");
    let foundTargetYear = false;

    top40.forEach((chunk, i) => {
        const isTarget = chunk.title.toLowerCase().includes('2021') || chunk.title.toLowerCase().includes('2022');
        if (isTarget) foundTargetYear = true;

        console.log(`[#${i + 1}] Sim: ${chunk.similarity.toFixed(4)} | Title: ${chunk.title} | Text: "${chunk.text.replace(/\n/g, ' ')}..."`);
    });

    if (!foundTargetYear) {
        console.log("\n[FAILURE] Top 40 does NOT include 2021/2022 documents!");

        // Find where they are
        const targets = scoredChunks.filter(c => c.title.toLowerCase().includes('2021') || c.title.toLowerCase().includes('2022'));
        targets.sort((a, b) => b.similarity - a.similarity);

        console.log("\n--- Where are the 2021/2022 docs? ---");
        targets.slice(0, 5).forEach(c => {
            const rank = scoredChunks.indexOf(c) + 1;
            console.log(`[Rank #${rank}] Sim: ${c.similarity.toFixed(4)} | Title: ${c.title}`);
        });
    } else {
        console.log("\n[SUCCESS] Top 40 INCLUDES 2021/2022 documents. Problem might be in actual function filtering logic.");
    }
}

simulateSearch().catch(console.error);
