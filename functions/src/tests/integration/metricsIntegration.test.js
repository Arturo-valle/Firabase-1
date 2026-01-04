const chai = require('chai');
const sinon = require('sinon');
const test = require('firebase-functions-test')();

const { expect } = chai;

// Create stubs outside to be accessible 
const firestoreStub = sinon.stub();
const collectionStub = sinon.stub();
const docStub = sinon.stub();
const getStub = sinon.stub();
const setStub = sinon.stub();
const whereStub = sinon.stub();
const limitStub = sinon.stub();
const orderByStub = sinon.stub();
const vertexAIStub = sinon.stub();

// Proxyquire to inject mocks
const proxyquire = require('proxyquire');
const extractionService = proxyquire('../../services/metrics/extractionService', {
    'firebase-admin/firestore': { getFirestore: firestoreStub },
    '../vertexAI': {
        generateFinancialAnalysis: vertexAIStub,
        AI_CONFIG: { REASONING_MODEL: 'gemini-test' }
    },
    '../../utils/issuerConfig': {
        loadRemoteConfig: async () => ({
            extractionMapping: { 'test-issuer': ['test-issuer'] },
            aliases: {}
        }),
        findIssuerId: (id) => id
    }
});

describe('Metrics Extraction Integration', () => {
    after(() => {
        test.cleanup();
    });

    beforeEach(() => {
        // Reset and re-configure mocks
        sinon.reset(); // Resets history

        // Default behaviors
        firestoreStub.returns({ collection: collectionStub });
        collectionStub.returns({ doc: docStub, where: whereStub, orderBy: orderByStub });
        docStub.returns({ get: getStub, set: setStub, collection: collectionStub });
        whereStub.returns({ limit: limitStub, orderBy: orderByStub, where: whereStub });
        limitStub.returns({ get: getStub });
        orderByStub.returns({ limit: limitStub, get: getStub, where: whereStub }); // Added chaining

        // Default Vertex resolves
        vertexAIStub.resolves({
            capital: { activosTotales: 1000 },
            metadata: { moneda: 'USD' }
        });
    });

    it('should successfully orchestrate metrics extraction', async () => {
        const mockChunks = [
            {
                data: () => ({ text: 'Financial Report 2024', metadata: { date: '2024-01-01', docType: 'FINANCIAL_REPORT' } }),
                id: 'chunk1'
            }
        ];

        getStub.resolves({
            empty: false,
            docs: mockChunks,
            exists: true,
            data: () => ({ exchangeRate: 36.6 })
        });

        const result = await extractionService.extractIssuerMetrics('test-issuer', 'Test Issuer');

        // Result IS the metrics object
        expect(result).to.have.property('issuerId', 'test-issuer');
        expect(result).to.have.nested.property('capital.activosTotales', 1000);
        expect(vertexAIStub.calledOnce).to.be.true;
        expect(setStub.called).to.be.true;
    });

    it('should handle missing chunks gracefully', async () => {
        getStub.resolves({ empty: true, docs: [] });

        const result = await extractionService.extractIssuerMetrics('ghost-issuer', 'Ghost Issuer');

        expect(result).to.have.property('error');
    });
});
