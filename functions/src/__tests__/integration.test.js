/**
 * Integration Tests for CentraCapital
 * These tests run against Firebase Emulators to test real Firestore operations
 * 
 * Run with: npm run test:integration
 */

const chai = require('chai');
const { expect } = chai;

// Check if we're running in emulator mode
const isEmulatorMode = process.env.FIRESTORE_EMULATOR_HOST !== undefined;

describe('Integration Tests (Firebase Emulators)', function () {
    // Increase timeout for integration tests
    this.timeout(30000);

    // Skip all integration tests if not running with emulators
    before(function () {
        if (!isEmulatorMode) {
            console.log('⚠️  Skipping integration tests - Firebase Emulators not detected');
            console.log('   Run with: npm run test:integration');
            this.skip();
        }
    });

    describe('Firestore Operations', () => {
        let admin;
        let db;

        before(async function () {
            if (!isEmulatorMode) return this.skip();

            // Initialize Firebase Admin for emulator
            admin = require('firebase-admin');
            if (admin.apps.length === 0) {
                admin.initializeApp({ projectId: 'demo-test-project' });
            }
            db = admin.firestore();
        });

        afterEach(async function () {
            if (!isEmulatorMode) return;

            // Clean up test data after each test
            const collections = ['issuers', 'documentChunks', 'financialMetrics'];
            for (const collName of collections) {
                const snapshot = await db.collection(collName).get();
                const batch = db.batch();
                snapshot.docs.forEach(doc => batch.delete(doc.ref));
                if (snapshot.docs.length > 0) {
                    await batch.commit();
                }
            }
        });

        it('should create and read an issuer document', async function () {
            if (!isEmulatorMode) return this.skip();

            const testIssuer = {
                name: 'Test Issuer',
                acronym: 'TEST',
                sector: 'Finanzas',
                active: true,
                createdAt: new Date()
            };

            // Create
            await db.collection('issuers').doc('test-issuer').set(testIssuer);

            // Read
            const doc = await db.collection('issuers').doc('test-issuer').get();
            expect(doc.exists).to.be.true;
            expect(doc.data().name).to.equal('Test Issuer');
            expect(doc.data().acronym).to.equal('TEST');
        });

        it('should store and query document chunks', async function () {
            if (!isEmulatorMode) return this.skip();

            const testChunks = [
                { issuerId: 'banpro', text: 'Financial data ROE 15%', chunkIndex: 0 },
                { issuerId: 'banpro', text: 'Balance sheet assets', chunkIndex: 1 },
                { issuerId: 'bdf', text: 'BDF quarterly report', chunkIndex: 0 }
            ];

            // Store chunks
            const batch = db.batch();
            testChunks.forEach((chunk, i) => {
                const ref = db.collection('documentChunks').doc(`chunk-${i}`);
                batch.set(ref, chunk);
            });
            await batch.commit();

            // Query by issuerId
            const banproChunks = await db.collection('documentChunks')
                .where('issuerId', '==', 'banpro')
                .get();

            expect(banproChunks.size).to.equal(2);
        });

        it('should store financial metrics with year-based ID', async function () {
            if (!isEmulatorMode) return this.skip();

            const testMetrics = {
                issuerId: 'banpro',
                issuerName: 'Banco de la Producción',
                year: 2024,
                period: 'Annual',
                metrics: {
                    net_income: 1500000,
                    total_assets: 50000000,
                    total_equity: 8000000,
                    roe: 0.1875
                },
                updatedAt: new Date()
            };

            // Store
            await db.collection('financialMetrics').doc('banpro_2024').set(testMetrics);

            // Read
            const doc = await db.collection('financialMetrics').doc('banpro_2024').get();
            expect(doc.exists).to.be.true;
            expect(doc.data().metrics.roe).to.equal(0.1875);
            expect(doc.data().year).to.equal(2024);
        });

        it('should handle batch writes correctly', async function () {
            if (!isEmulatorMode) return this.skip();

            const BATCH_SIZE = 100;
            const chunks = Array(150).fill().map((_, i) => ({
                issuerId: 'test-issuer',
                text: `Chunk ${i}`,
                chunkIndex: i
            }));

            // Write in batches
            for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
                const batch = db.batch();
                const batchChunks = chunks.slice(i, i + BATCH_SIZE);
                batchChunks.forEach((chunk, j) => {
                    const ref = db.collection('documentChunks').doc(`batch-chunk-${i + j}`);
                    batch.set(ref, chunk);
                });
                await batch.commit();
            }

            // Verify all chunks were created
            const allChunks = await db.collection('documentChunks')
                .where('issuerId', '==', 'test-issuer')
                .get();

            expect(allChunks.size).to.equal(150);
        });
    });

    describe('Document Processing Pipeline', () => {
        let admin;
        let db;

        before(async function () {
            if (!isEmulatorMode) return this.skip();

            admin = require('firebase-admin');
            db = admin.firestore();
        });

        it('should store processed chunks with metadata', async function () {
            if (!isEmulatorMode) return this.skip();

            const processedChunk = {
                issuerId: 'fama',
                documentId: 'estados_financieros_2024',
                chunkIndex: 0,
                text: 'FAMA reported a net income of C$ 50,000,000',
                embedding: Array(768).fill(0.1),
                metadata: {
                    issuerName: 'Financiera FAMA',
                    documentTitle: 'Estados Financieros 2024',
                    documentUrl: 'https://example.com/doc.pdf',
                    documentDate: '2024-12-01',
                    documentType: 'Estados Financieros',
                    processedAt: new Date().toISOString()
                },
                createdAt: new Date()
            };

            await db.collection('documentChunks').doc('fama_ef2024_chunk_0').set(processedChunk);

            const doc = await db.collection('documentChunks').doc('fama_ef2024_chunk_0').get();
            expect(doc.exists).to.be.true;
            expect(doc.data().metadata.documentTitle).to.equal('Estados Financieros 2024');
            expect(doc.data().embedding).to.have.lengthOf(768);
        });
    });
});
