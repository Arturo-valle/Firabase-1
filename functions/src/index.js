const express = require('express');
const cors = require('cors');
const path = require('path');
const { getIssuers } = require('./getIssuers');
const { getBolsanicDocuments } = require('./getBolsanicDocuments');
const { getSiboifFacts } = require('./getSiboifFacts');

const app = express();
const PORT = process.env.PORT || 8080;

// 1. Middleware
app.use(cors()); // Enable CORS for all routes
app.use(express.json());

// Serve static files from the React app build directory
const webappPath = path.join(__dirname, '..', '..', 'webapp', 'dist');
app.use(express.static(webappPath));

// 2. API Route
app.get('/api/issuers', async (req, res) => {
  try {
    console.log('Fetching issuers...');
    const issuers = await getIssuers();
    console.log(`Found ${issuers.length} issuers.`);

    const detailedIssuers = await Promise.all(issuers.map(async (issuer) => {
      console.log(`Fetching documents for ${issuer.name}...`);
      const bolsanicDocs = await getBolsanicDocuments(issuer.detailUrl);
      console.log(`Fetching SIBOIF facts for ${issuer.name}...`);
      const siboifFacts = await scrapeSiboifFacts(issuer.name);
      
      return {
        ...issuer,
        documents: [...bolsanicDocs, ...siboifFacts],
      };
    }));

    res.status(200).json(detailedIssuers);
  } catch (error) {
    console.error('Error fetching issuer data:', error);
    res.status(500).send('Failed to fetch issuer data');
  }
});

// 3. Serve the frontend for any other request
app.get('*', (req, res) => {
  res.sendFile(path.join(webappPath, 'index.html'));
});

// 4. Start the server
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
