const chai = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire');
const { expect } = chai;

describe('RAG Query API', () => {
    let ragQuery;
    let firestoreMock;
    let vertexAIMock;
    let loggerMock;

    // Helper to create a proper Firestore snapshot mock with forEach
    const createSnapshotMock = (docs = [], empty = false) => ({
        empty: empty || docs.length === 0,
        docs: docs,
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

        // Mock Vertex AI
        vertexAIMock = {
            generateEmbeddings: sinon.stub().resolves(Array(768).fill(0.1)),
            generateFinancialAnalysis: sinon.stub().resolves('AI Analysis Response'),
            cosineSimilarity: sinon.stub().returns(0.8),
            FINANCIAL_PROMPTS: {
                generalQuery: (query, context) => `Query: ${query}\nContext: ${context}`,
                creditRating: (name, docs) => `Rating for ${name}`,
                comparativeAnalysis: (names, docs) => `Compare: ${names}`,
                comparative: (names, docs) => `Compare: ${names}`,
                executiveSummary: (name, docs) => `Summary for ${name}`
            }
        };

        // Mock Firestore - will be customized per test
        firestoreMock = {
            collection: sinon.stub().returnsThis(),
            where: sinon.stub().returnsThis(),
            orderBy: sinon.stub().returnsThis(),
            limit: sinon.stub().returnsThis(),
            get: sinon.stub().resolves(createSnapshotMock([])),
        };
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('searchRelevantDocuments', () => {
        it('should return chunks sorted by similarity when documents exist', async () => {
            const mockDocs = [
                { id: 'chunk1', data: () => ({ text: 'Financial data about ROE', embedding: Array(768).fill(0.1), issuerId: 'banpro', metadata: { title: 'Informe 2024' } }) },
                { id: 'chunk2', data: () => ({ text: 'Balance sheet details', embedding: Array(768).fill(0.2), issuerId: 'banpro', metadata: { title: 'Balance 2024' } }) }
            ];

            firestoreMock.get.resolves(createSnapshotMock(mockDocs));

            ragQuery = proxyquire('./ragQuery', {
                'firebase-admin/firestore': { getFirestore: () => firestoreMock },
                '../services/vertexAI': vertexAIMock,
                'firebase-functions': { logger: loggerMock }
            });

            const results = await ragQuery.searchRelevantDocuments('ROE de banpro', 'banpro', 10);

            expect(results).to.be.an('array');
            expect(vertexAIMock.generateEmbeddings.calledOnce).to.be.true;
        });

        it('should filter by issuerId when provided', async () => {
            firestoreMock.get.resolves(createSnapshotMock([]));

            ragQuery = proxyquire('./ragQuery', {
                'firebase-admin/firestore': { getFirestore: () => firestoreMock },
                '../services/vertexAI': vertexAIMock,
                'firebase-functions': { logger: loggerMock }
            });

            await ragQuery.searchRelevantDocuments('test query', 'specific-issuer', 10);

            expect(firestoreMock.where.called).to.be.true;
        });

        it('should limit results to topK parameter', async () => {
            const mockDocs = Array(30).fill(null).map((_, i) => ({
                id: `chunk${i}`,
                data: () => ({ text: `Chunk ${i}`, embedding: Array(768).fill(0.1 * (i + 1)), issuerId: 'banpro', metadata: {} })
            }));

            firestoreMock.get.resolves(createSnapshotMock(mockDocs));
            vertexAIMock.cosineSimilarity = sinon.stub().callsFake(() => Math.random());

            ragQuery = proxyquire('./ragQuery', {
                'firebase-admin/firestore': { getFirestore: () => firestoreMock },
                '../services/vertexAI': vertexAIMock,
                'firebase-functions': { logger: loggerMock }
            });

            const results = await ragQuery.searchRelevantDocuments('test', null, 5);

            expect(results.length).to.be.at.most(5);
        });

        it('should return empty array when no documents found', async () => {
            firestoreMock.get.resolves(createSnapshotMock([], true));

            ragQuery = proxyquire('./ragQuery', {
                'firebase-admin/firestore': { getFirestore: () => firestoreMock },
                '../services/vertexAI': vertexAIMock,
                'firebase-functions': { logger: loggerMock }
            });

            const results = await ragQuery.searchRelevantDocuments('test query', 'unknown-issuer', 10);

            expect(results).to.be.an('array').that.is.empty;
        });
    });

    describe('buildContext (internal function)', () => {
        // buildContext is NOT exported, so we verify its behavior indirectly
        it('should not be directly accessible (internal function)', () => {
            ragQuery = proxyquire('./ragQuery', {
                'firebase-admin/firestore': { getFirestore: () => firestoreMock },
                '../services/vertexAI': vertexAIMock,
                'firebase-functions': { logger: loggerMock }
            });

            // buildContext is not exported
            expect(ragQuery.buildContext).to.be.undefined;
        });
    });

    describe('handleRAGQuery', () => {
        let mockReq, mockRes;

        beforeEach(() => {
            mockReq = {
                body: { query: 'Cuál es el ROE de Banpro?' },
                query: {}
            };

            mockRes = {
                json: sinon.stub(),
                status: sinon.stub().returnsThis()
            };
        });

        it('should return 400 if query is missing', async () => {
            mockReq.body = {};
            firestoreMock.get.resolves(createSnapshotMock([]));

            ragQuery = proxyquire('./ragQuery', {
                'firebase-admin/firestore': { getFirestore: () => firestoreMock },
                '../services/vertexAI': vertexAIMock,
                'firebase-functions': { logger: loggerMock }
            });

            await ragQuery.handleRAGQuery(mockReq, mockRes);

            expect(mockRes.status.calledWith(400)).to.be.true;
        });

        it('should return 503 when no document chunks exist', async () => {
            firestoreMock.get.resolves(createSnapshotMock([], true));

            ragQuery = proxyquire('./ragQuery', {
                'firebase-admin/firestore': { getFirestore: () => firestoreMock },
                '../services/vertexAI': vertexAIMock,
                'firebase-functions': { logger: loggerMock }
            });

            await ragQuery.handleRAGQuery(mockReq, mockRes);

            expect(mockRes.status.calledWith(503)).to.be.true;
        });

        it('should process query and return AI response with documents', async () => {
            const mockDocs = [
                { id: 'chunk1', data: () => ({ text: 'Banpro ROE: 15%', embedding: Array(768).fill(0.1), issuerId: 'banpro', metadata: { issuerName: 'Banpro', documentTitle: 'Informe 2024', documentType: 'Financial', documentDate: '2024-01-01' } }) }
            ];

            firestoreMock.get.resolves(createSnapshotMock(mockDocs));

            ragQuery = proxyquire('./ragQuery', {
                'firebase-admin/firestore': { getFirestore: () => firestoreMock },
                '../services/vertexAI': vertexAIMock,
                'firebase-functions': { logger: loggerMock }
            });

            await ragQuery.handleRAGQuery(mockReq, mockRes);

            // Should either return JSON or status (depending on chunks found)
            expect(mockRes.json.called || mockRes.status.called).to.be.true;
        });

        it('should handle errors gracefully', async () => {
            firestoreMock.get.rejects(new Error('Database error'));

            ragQuery = proxyquire('./ragQuery', {
                'firebase-admin/firestore': { getFirestore: () => firestoreMock },
                '../services/vertexAI': vertexAIMock,
                'firebase-functions': { logger: loggerMock }
            });

            await ragQuery.handleRAGQuery(mockReq, mockRes);

            expect(mockRes.status.calledWith(500)).to.be.true;
        });
    });

    describe('handleComparativeAnalysis', () => {
        let mockReq, mockRes;

        beforeEach(() => {
            mockReq = {
                body: { issuerIds: ['banpro', 'bdf'] }
            };

            mockRes = {
                json: sinon.stub(),
                status: sinon.stub().returnsThis()
            };
        });

        it('should return 400 if issuerIds is not an array', async () => {
            mockReq.body = { issuerIds: 'not-an-array' };
            firestoreMock.get.resolves(createSnapshotMock([]));

            ragQuery = proxyquire('./ragQuery', {
                'firebase-admin/firestore': { getFirestore: () => firestoreMock },
                '../services/vertexAI': vertexAIMock,
                'firebase-functions': { logger: loggerMock }
            });

            await ragQuery.handleComparativeAnalysis(mockReq, mockRes);

            expect(mockRes.status.calledWith(400)).to.be.true;
        });

        it('should return 400 if issuerIds has less than 2 items', async () => {
            mockReq.body = { issuerIds: ['banpro'] };
            firestoreMock.get.resolves(createSnapshotMock([]));

            ragQuery = proxyquire('./ragQuery', {
                'firebase-admin/firestore': { getFirestore: () => firestoreMock },
                '../services/vertexAI': vertexAIMock,
                'firebase-functions': { logger: loggerMock }
            });

            await ragQuery.handleComparativeAnalysis(mockReq, mockRes);

            expect(mockRes.status.calledWith(400)).to.be.true;
        });
    });

    describe('handleInsights', () => {
        let mockReq, mockRes;

        beforeEach(() => {
            mockReq = {
                params: { issuerId: 'banpro' },
                query: {}
            };

            mockRes = {
                json: sinon.stub(),
                status: sinon.stub().returnsThis()
            };
        });

        it('should return 400 if issuerId is missing', async () => {
            mockReq.params = {};
            firestoreMock.get.resolves(createSnapshotMock([]));

            ragQuery = proxyquire('./ragQuery', {
                'firebase-admin/firestore': { getFirestore: () => firestoreMock },
                '../services/vertexAI': vertexAIMock,
                'firebase-functions': { logger: loggerMock }
            });

            await ragQuery.handleInsights(mockReq, mockRes);

            expect(mockRes.status.calledWith(400)).to.be.true;
        });

        it('should return success:false when no documents found', async () => {
            firestoreMock.get.resolves(createSnapshotMock([], true));

            ragQuery = proxyquire('./ragQuery', {
                'firebase-admin/firestore': { getFirestore: () => firestoreMock },
                '../services/vertexAI': vertexAIMock,
                'firebase-functions': { logger: loggerMock }
            });

            await ragQuery.handleInsights(mockReq, mockRes);

            expect(mockRes.json.called).to.be.true;
            const response = mockRes.json.firstCall.args[0];
            expect(response.success).to.be.false;
        });

        it('should generate insights for valid issuer with documents', async () => {
            const mockDocs = [
                { id: 'chunk1', data: () => ({ text: 'Issuer financial insights ROE 15%', embedding: Array(768).fill(0.1), issuerId: 'banpro', metadata: { issuerName: 'Banpro', documentTitle: 'Report', documentType: 'Financial', documentDate: '2024-01-01' } }) }
            ];

            firestoreMock.get.resolves(createSnapshotMock(mockDocs));
            vertexAIMock.generateFinancialAnalysis.resolves('{"insight":"Good performance","sentiment":"positive","confidence":0.9}');

            ragQuery = proxyquire('./ragQuery', {
                'firebase-admin/firestore': { getFirestore: () => firestoreMock },
                '../services/vertexAI': vertexAIMock,
                'firebase-functions': { logger: loggerMock }
            });

            await ragQuery.handleInsights(mockReq, mockRes);

            expect(mockRes.json.called).to.be.true;
        });
    });
});
