const chai = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire');
const { expect } = chai;

describe('Vertex AI Service', () => {
    let vertexAI;
    let axiosMock;
    let loggerMock;
    let googleGenAIMock;

    beforeEach(() => {
        // Mock Logger
        loggerMock = {
            info: sinon.stub(),
            warn: sinon.stub(),
            error: sinon.stub(),
        };

        // Mock axios for embeddings
        axiosMock = {
            post: sinon.stub()
        };

        // Mock GoogleGenAI client
        const mockGenerateContent = sinon.stub().resolves({
            text: '{"analysis": "test response"}'
        });

        googleGenAIMock = {
            models: {
                generateContent: mockGenerateContent
            }
        };

        // Mock GoogleAuth
        const googleAuthMock = {
            GoogleAuth: class {
                async getClient() {
                    return {
                        getAccessToken: async () => ({ token: 'mock-token' })
                    };
                }
            }
        };

        vertexAI = proxyquire('./vertexAI', {
            '@google/genai': {
                GoogleGenAI: sinon.stub().returns(googleGenAIMock)
            },
            'axios': axiosMock,
            'firebase-functions': { logger: loggerMock },
            'google-auth-library': googleAuthMock
        });
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('cosineSimilarity', () => {
        it('should return 1 for identical vectors', () => {
            const vectorA = [1, 0, 0];
            const vectorB = [1, 0, 0];
            const similarity = vertexAI.cosineSimilarity(vectorA, vectorB);
            expect(similarity).to.be.closeTo(1, 0.0001);
        });

        it('should return 0 for orthogonal vectors', () => {
            const vectorA = [1, 0, 0];
            const vectorB = [0, 1, 0];
            const similarity = vertexAI.cosineSimilarity(vectorA, vectorB);
            expect(similarity).to.be.closeTo(0, 0.0001);
        });

        it('should return -1 for opposite vectors', () => {
            const vectorA = [1, 0, 0];
            const vectorB = [-1, 0, 0];
            const similarity = vertexAI.cosineSimilarity(vectorA, vectorB);
            expect(similarity).to.be.closeTo(-1, 0.0001);
        });

        it('should throw error for vectors of different lengths', () => {
            const vectorA = [1, 0, 0];
            const vectorB = [1, 0];
            expect(() => vertexAI.cosineSimilarity(vectorA, vectorB)).to.throw('Vectors must have the same length');
        });
    });

    describe('generateEmbeddings', () => {
        it('should return embeddings array when API call succeeds', async () => {
            const mockEmbeddings = Array(768).fill(0.1);
            axiosMock.post.resolves({
                data: {
                    predictions: [{
                        embeddings: {
                            values: mockEmbeddings
                        }
                    }]
                }
            });

            const result = await vertexAI.generateEmbeddings('test text');
            expect(result).to.have.lengthOf(768);
            expect(result[0]).to.equal(0.1);
        });

        it('should throw error when no embeddings in response', async () => {
            axiosMock.post.resolves({
                data: {
                    predictions: [{}]
                }
            });

            try {
                await vertexAI.generateEmbeddings('test text');
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect(error.message).to.include('Failed to generate embeddings');
            }
        });
    });

    describe('generateFinancialAnalysis', () => {
        it('should return text response from Gemini and clean it', async () => {
            googleGenAIMock.models.generateContent.resolves({
                text: '```json\n{"result": "ok"}\n```'
            });

            const result = await vertexAI.generateFinancialAnalysis('Test prompt');
            expect(result).to.equal('{"result": "ok"}');
        });

        it('should handle and clean malformed JSON from Gemini', async () => {
            googleGenAIMock.models.generateContent.resolves({
                text: 'Analysis: {"result": "ok"} // with comments'
            });

            const result = await vertexAI.generateFinancialAnalysis('Test prompt');
            expect(result).to.equal('{"result": "ok"}');
        });
    });

    describe('FINANCIAL_PROMPTS', () => {
        it('should contain all required prompt templates', () => {
            expect(vertexAI.FINANCIAL_PROMPTS).to.have.property('creditRating');
            expect(vertexAI.FINANCIAL_PROMPTS).to.have.property('comparativeAnalysis');
            expect(vertexAI.FINANCIAL_PROMPTS).to.have.property('executiveSummary');
            expect(vertexAI.FINANCIAL_PROMPTS).to.have.property('generalQuery');
        });
    });
});

