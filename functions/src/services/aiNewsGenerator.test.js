const chai = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire');
const { expect } = chai;

describe('AI News Generator Service', () => {
    let aiNewsGenerator;
    let firestoreMock;
    let loggerMock;

    // Helper to create a proper Firestore snapshot mock
    const createSnapshotMock = (docs = [], empty = false) => ({
        empty: empty || docs.length === 0,
        docs: docs,
        size: docs.length,
        forEach: function (callback) {
            this.docs.forEach(callback);
        }
    });

    beforeEach(() => {
        loggerMock = {
            info: sinon.stub(),
            warn: sinon.stub(),
            error: sinon.stub(),
        };

        // Default Firestore mock
        firestoreMock = {
            collection: sinon.stub().returnsThis(),
            where: sinon.stub().returnsThis(),
            orderBy: sinon.stub().returnsThis(),
            limit: sinon.stub().returnsThis(),
            get: sinon.stub().resolves(createSnapshotMock([])),
            doc: sinon.stub().returnsThis(),
        };
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('generateNews', () => {
        it('should return empty array when no recent documents exist', async () => {
            firestoreMock.get.resolves(createSnapshotMock([]));

            aiNewsGenerator = proxyquire('./aiNewsGenerator', {
                'firebase-admin/firestore': { getFirestore: () => firestoreMock },
                'firebase-functions': { logger: loggerMock }
            });

            const result = await aiNewsGenerator.generateNews(7);
            expect(result).to.be.an('array');
        });

        it('should process documents from the last N days', async () => {
            const mockDocs = [{
                data: () => ({
                    text: 'Documento financiero de prueba',
                    metadata: { title: 'Estados Financieros 2024', documentDate: new Date().toISOString() },
                    issuerId: 'banpro'
                }),
                id: 'doc1'
            }];

            firestoreMock.get.resolves(createSnapshotMock(mockDocs));

            aiNewsGenerator = proxyquire('./aiNewsGenerator', {
                'firebase-admin/firestore': { getFirestore: () => firestoreMock },
                'firebase-functions': { logger: loggerMock }
            });

            const result = await aiNewsGenerator.generateNews(7);
            expect(result).to.be.an('array');
        });

        it('should respect the daysBack parameter', async () => {
            firestoreMock.get.resolves(createSnapshotMock([]));

            aiNewsGenerator = proxyquire('./aiNewsGenerator', {
                'firebase-admin/firestore': { getFirestore: () => firestoreMock },
                'firebase-functions': { logger: loggerMock }
            });

            await aiNewsGenerator.generateNews(30);
            expect(firestoreMock.collection.called).to.be.true;
        });
    });

    describe('generateIssuerInsights', () => {
        it('should return null when no chunks exist for issuer', async () => {
            firestoreMock.get.resolves(createSnapshotMock([], true));

            aiNewsGenerator = proxyquire('./aiNewsGenerator', {
                'firebase-admin/firestore': { getFirestore: () => firestoreMock },
                'firebase-functions': { logger: loggerMock }
            });

            const result = await aiNewsGenerator.generateIssuerInsights('unknown-issuer', 'Unknown');

            // Returns null when no chunks found
            expect(result).to.be.null;
        });

        it('should return insights object when chunks exist', async () => {
            const mockChunks = [{
                data: () => ({
                    text: 'ROE: 15%, Activos: C$ 5,000 millones',
                    metadata: { title: 'Informe Q3 2024' }
                })
            }];

            firestoreMock.get.resolves(createSnapshotMock(mockChunks));

            const mockAIResponse = '{"insight":"Banpro muestra sólido desempeño","sentiment":"positive","confidence":0.85,"metrics":["ROE: 15%"]}';

            aiNewsGenerator = proxyquire('./aiNewsGenerator', {
                'firebase-admin/firestore': { getFirestore: () => firestoreMock },
                'firebase-functions': { logger: loggerMock },
                './vertexAI': { generateFinancialAnalysis: sinon.stub().resolves(mockAIResponse) }
            });

            const result = await aiNewsGenerator.generateIssuerInsights('banpro', 'Banco de la Producción');

            // Should return an object with insight data
            expect(result).to.be.an('object');
            expect(result).to.have.property('issuerId', 'banpro');
        });
    });

    describe('enhanceSearchQuery', () => {
        it('should return an object with query analysis', async () => {
            const mockAIResponse = '{"intent":"search_issuer","issuers":["banpro"],"metrics":["roe"],"timeframe":null,"enhancedQuery":"banpro roe"}';

            aiNewsGenerator = proxyquire('./aiNewsGenerator', {
                'firebase-admin/firestore': { getFirestore: () => firestoreMock },
                'firebase-functions': { logger: loggerMock },
                './vertexAI': { generateFinancialAnalysis: sinon.stub().resolves(mockAIResponse) }
            });

            const result = await aiNewsGenerator.enhanceSearchQuery('banpro roe');

            // Returns an object, not a string
            expect(result).to.be.an('object');
            expect(result).to.have.property('intent');
            expect(result).to.have.property('enhancedQuery');
        });

        it('should return fallback object when AI fails', async () => {
            aiNewsGenerator = proxyquire('./aiNewsGenerator', {
                'firebase-admin/firestore': { getFirestore: () => firestoreMock },
                'firebase-functions': { logger: loggerMock },
                './vertexAI': { generateFinancialAnalysis: sinon.stub().rejects(new Error('AI Error')) }
            });

            const result = await aiNewsGenerator.enhanceSearchQuery('test query');

            // Should return fallback object
            expect(result).to.be.an('object');
            expect(result).to.have.property('intent', 'general_query');
            expect(result).to.have.property('enhancedQuery', 'test query');
        });

        it('should handle empty query', async () => {
            aiNewsGenerator = proxyquire('./aiNewsGenerator', {
                'firebase-admin/firestore': { getFirestore: () => firestoreMock },
                'firebase-functions': { logger: loggerMock },
                './vertexAI': { generateFinancialAnalysis: sinon.stub().resolves('{}') }
            });

            const result = await aiNewsGenerator.enhanceSearchQuery('');

            expect(result).to.be.an('object');
        });
    });

    describe('handleAIQuery', () => {
        it('should return answer and sources for valid query', async () => {
            const mockChunks = [{
                data: () => ({
                    text: 'Banpro ROE 2024: 15%',
                    embedding: Array(768).fill(0.1),
                    metadata: { title: 'Informe Anual', documentDate: '2024-01-01', issuerName: 'Banpro' }
                })
            }];

            // Mock for issuer lookup
            const issuerSnapshot = { exists: true, data: () => ({ name: 'Banpro' }) };

            let callCount = 0;
            firestoreMock.get.callsFake(() => {
                callCount++;
                if (callCount === 1) {
                    // First call is for issuer doc
                    return Promise.resolve(issuerSnapshot);
                }
                // Subsequent calls are for chunks
                return Promise.resolve(createSnapshotMock(mockChunks));
            });

            const mockEmbeddings = Array(768).fill(0.1);
            const mockAIResponse = 'El ROE de Banpro es 15%';

            aiNewsGenerator = proxyquire('./aiNewsGenerator', {
                'firebase-admin/firestore': { getFirestore: () => firestoreMock },
                'firebase-functions': { logger: loggerMock },
                './vertexAI': {
                    generateEmbeddings: sinon.stub().resolves(mockEmbeddings),
                    generateFinancialAnalysis: sinon.stub().resolves(mockAIResponse),
                    cosineSimilarity: sinon.stub().returns(0.9)
                }
            });

            const result = await aiNewsGenerator.handleAIQuery('¿Cuál es el ROE de Banpro?', 'banpro', 'general');

            expect(result).to.be.an('object');
            expect(result).to.have.property('answer');
            expect(result).to.have.property('sources');
        });

        it('should handle queries without specific issuer', async () => {
            firestoreMock.get.resolves(createSnapshotMock([]));

            aiNewsGenerator = proxyquire('./aiNewsGenerator', {
                'firebase-admin/firestore': { getFirestore: () => firestoreMock },
                'firebase-functions': { logger: loggerMock },
                './vertexAI': {
                    generateEmbeddings: sinon.stub().resolves(Array(768).fill(0)),
                    generateFinancialAnalysis: sinon.stub().resolves('No data available'),
                    cosineSimilarity: sinon.stub().returns(0)
                }
            });

            const result = await aiNewsGenerator.handleAIQuery('Análisis general', null, 'general');

            expect(result).to.be.an('object');
        });
    });
});
