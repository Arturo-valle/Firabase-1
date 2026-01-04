const https = require('https');

const API_URL = 'https://api-os3qsxfz6q-uc.a.run.app/debug/view-text/horizonte';

console.log(`Inspecting text content for horizonte...`);

https.get(API_URL, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            console.log("\n### CHUNK TEXT INSPECTION ###");
            console.log(`Chunks Found: ${json.count}`);
            if (json.chunks && json.chunks.length > 0) {
                json.chunks.forEach((c, i) => {
                    console.log(`\n--- Chunk ${i + 1} (ID: ${c.id}) ---`);
                    console.log(`Length: ${c.textLen} chars`);
                    console.log(`Preview:`);
                    console.log(c.textPreview);
                    console.log(`Metadata:`, JSON.stringify(c.metadata || {}));
                });
            } else {
                console.log("No chunks returned to inspect.");
            }
        } catch (e) {
            console.error("Error parsing response:", e);
            console.log("Raw Response:", data);
        }
    });
});
