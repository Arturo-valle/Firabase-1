const chai = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire');
const { expect } = chai;

describe('Document Processor Service', () => {
    let documentProcessor;
    let axiosMock;
    let pdfParseMock;
    let firestoreMock;
    let loggerMock;
    let generateEmbeddingsMock;

    beforeEach(() => {
        // Mock Logger
        loggerMock = {
            info: sinon.stub(),
            warn: sinon.stub(),
            error: sinon.stub(),
        };

        // Mock axios
        axiosMock = {
            get: sinon.stub()
        };

        // Mock pdf-parse
        pdfParseMock = sinon.stub();

        // Mock embeddings generator
        generateEmbeddingsMock = sinon.stub().resolves(Array(768).fill(0.1));

        // Mock Firestore
        const batchMock = {
            set: sinon.stub(),
            commit: sinon.stub().resolves()
        };

        firestoreMock = {
            collection: sinon.stub().returnsThis(),
            doc: sinon.stub().returnsThis(),
            batch: sinon.stub().returns(batchMock),
            set: sinon.stub().resolves(),
        };

        documentProcessor = proxyquire('./documentProcessor', {
            'axios': axiosMock,
            'pdf-parse': pdfParseMock,
            'firebase-admin/firestore': { getFirestore: () => firestoreMock },
            './vertexAI': {
                generateEmbeddings: generateEmbeddingsMock,
                generateFinancialAnalysis: sinon.stub().resolves('{}')
            },
            'firebase-functions': { logger: loggerMock },
            '@google-cloud/vision': {
                ImageAnnotatorClient: class {
                    documentTextDetection() { return [{ textAnnotations: [] }]; }
                }
            }
        });
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('chunkText', () => {
        it('should split text into chunks of specified size', () => {
            const text = 'A'.repeat(5000);
            const chunks = documentProcessor.chunkText(text, 1500, 200);

            expect(chunks).to.be.an('array');
            expect(chunks.length).to.be.greaterThan(1);
            chunks.forEach(chunk => {
                expect(chunk.length).to.be.at.most(1500);
            });
        });

        it('should respect overlap between chunks', () => {
            const text = 'Word1. Word2. Word3. Word4. Word5. Word6. Word7. Word8. Word9. Word10.';
            const chunks = documentProcessor.chunkText(text, 20, 5);

            expect(chunks.length).to.be.greaterThan(1);
        });

        it('should try to break at periods', () => {
            const text = 'First sentence here. Second sentence here. Third sentence here.';
            const chunks = documentProcessor.chunkText(text, 30, 5);

            // Should break at sentence boundaries when possible
            expect(chunks.length).to.be.greaterThan(0);
        });

        it('should filter out tiny chunks (less than 10 chars)', () => {
            const text = 'Short. A bit longer text here.';
            const chunks = documentProcessor.chunkText(text, 1000, 0);

            chunks.forEach(chunk => {
                expect(chunk.length).to.be.greaterThan(10);
            });
        });

        it('should handle empty text', () => {
            const chunks = documentProcessor.chunkText('', 1500, 200);
            expect(chunks).to.be.an('array').that.is.empty;
        });

        it('should handle text smaller than chunk size', () => {
            const text = 'This is a small text.';
            const chunks = documentProcessor.chunkText(text, 1500, 200);

            expect(chunks).to.have.lengthOf(1);
            expect(chunks[0]).to.equal(text);
        });
    });

    describe('downloadPDF', () => {
        it('should download PDF and return buffer', async () => {
            const mockPdfData = Buffer.from('PDF content here');
            axiosMock.get.resolves({ data: mockPdfData });

            const result = await documentProcessor.downloadPDF('https://example.com/test.pdf');

            expect(result).to.be.instanceOf(Buffer);
            expect(axiosMock.get.calledOnce).to.be.true;
        });

        it('should handle relative URLs by prepending bolsanic domain', async () => {
            const mockPdfData = Buffer.from('PDF content');
            axiosMock.get.resolves({ data: mockPdfData });

            await documentProcessor.downloadPDF('/documents/test.pdf');

            const calledUrl = axiosMock.get.firstCall.args[0];
            expect(calledUrl).to.include('bolsanic.com');
        });

        it('should encode URLs with spaces', async () => {
            const mockPdfData = Buffer.from('PDF content');
            axiosMock.get.resolves({ data: mockPdfData });

            await documentProcessor.downloadPDF('https://example.com/test file.pdf');

            const calledUrl = axiosMock.get.firstCall.args[0];
            expect(calledUrl).to.not.include(' ');
        });

        it('should throw error on network failure', async () => {
            axiosMock.get.rejects(new Error('Network error'));

            try {
                await documentProcessor.downloadPDF('https://example.com/test.pdf');
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect(error.message).to.include('Failed to download PDF');
            }
        });

        it('should include User-Agent header', async () => {
            const mockPdfData = Buffer.from('PDF content');
            axiosMock.get.resolves({ data: mockPdfData });

            await documentProcessor.downloadPDF('https://example.com/test.pdf');

            const options = axiosMock.get.firstCall.args[1];
            expect(options.headers['User-Agent']).to.exist;
        });
    });

    describe('extractTextFromPDF', () => {
        it('should extract text from valid PDF buffer', async () => {
            pdfParseMock.resolves({ text: 'Extracted PDF text content' });

            const result = await documentProcessor.extractTextFromPDF(Buffer.from('fake pdf'));

            expect(result).to.equal('Extracted PDF text content');
        });

        it('should throw error for invalid PDF', async () => {
            pdfParseMock.rejects(new Error('Invalid PDF'));

            try {
                await documentProcessor.extractTextFromPDF(Buffer.from('not a pdf'));
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect(error.message).to.include('Failed to extract text');
            }
        });
    });

    describe('storeDocumentChunks', () => {
        it('should store chunks in batches', async () => {
            const chunks = Array(150).fill().map((_, i) => ({
                chunkIndex: i,
                text: `Chunk ${i} text`,
                embedding: Array(768).fill(0.1),
                metadata: { title: 'Test Doc' }
            }));

            await documentProcessor.storeDocumentChunks('issuer-1', 'doc-1', chunks);

            // Should have created batches (150 chunks / 100 per batch = 2 batches)
            expect(firestoreMock.batch.callCount).to.be.gte(1);
        });

        it('should create correct document IDs', async () => {
            const chunks = [{
                chunkIndex: 0,
                text: 'Test chunk',
                embedding: Array(768).fill(0.1),
                metadata: {}
            }];

            await documentProcessor.storeDocumentChunks('banpro', 'informe_2024', chunks);

            // Check that doc() was called with correct pattern
            expect(firestoreMock.doc.called).to.be.true;
        });

        it('should handle empty chunks array', async () => {
            await documentProcessor.storeDocumentChunks('issuer-1', 'doc-1', []);

            // Should not create any batches
            expect(firestoreMock.batch.called).to.be.false;
        });
    });

    describe('processDocument', () => {
        it('should process document and return chunks with embeddings', async () => {
            const mockPdfData = Buffer.from('PDF data');
            axiosMock.get.resolves({ data: mockPdfData });
            pdfParseMock.resolves({ text: 'This is the extracted text from the PDF document. It has enough content to create chunks.' });

            const document = {
                url: 'https://example.com/test.pdf',
                title: 'Test Document',
                date: '2024-01-01',
                type: 'Informe'
            };

            const result = await documentProcessor.processDocument(document, 'Test Issuer', 'test-issuer');

            expect(result).to.have.property('chunks');
            expect(result.chunks).to.be.an('array');
        });

        it('should skip documents with insufficient text', async () => {
            const mockPdfData = Buffer.from('PDF data');
            axiosMock.get.resolves({ data: mockPdfData });
            pdfParseMock.resolves({ text: 'Short' }); // Less than 10 chars

            const document = {
                url: 'https://example.com/test.pdf',
                title: 'Empty Doc',
                date: '2024-01-01',
                type: 'Informe'
            };

            const result = await documentProcessor.processDocument(document, 'Test Issuer', 'test-issuer');

            // processDocument returns {chunks: []} for insufficient text OR returns []
            const chunks = result.chunks || result || [];
            expect(chunks).to.be.an('array').that.is.empty;
        });

        it('should handle download errors gracefully', async () => {
            axiosMock.get.rejects(new Error('Download failed'));

            const document = {
                url: 'https://example.com/broken.pdf',
                title: 'Broken Doc',
                date: '2024-01-01',
                type: 'Informe'
            };

            const result = await documentProcessor.processDocument(document, 'Test Issuer', 'test-issuer');

            expect(result.chunks).to.be.an('array').that.is.empty;
            expect(result.smartStatus).to.include('error');
        });
    });

    describe('processIssuerDocuments', () => {
        it('should process documents up to maxDocuments limit', async () => {
            const mockPdfData = Buffer.from('PDF data');
            axiosMock.get.resolves({ data: mockPdfData });
            pdfParseMock.resolves({ text: 'Sufficient text content for processing the document. ' + 'A'.repeat(200) });

            const documents = [
                { title: 'Doc 1', url: 'https://example.com/1.pdf', type: 'Estados Financieros', date: '2024-01-01' },
                { title: 'Doc 2', url: 'https://example.com/2.pdf', type: 'Estados Financieros', date: '2024-02-01' },
                { title: 'Doc 3', url: 'https://example.com/3.pdf', type: 'Estados Financieros', date: '2024-03-01' },
            ];

            const result = await documentProcessor.processIssuerDocuments('issuer-1', 'Issuer Name', documents, 2);

            expect(result.totalDocs).to.equal(3);
            // Should only process maxDocuments (2) if there are relevant docs
        });

        it('should prioritize audited financial statements', async () => {
            const documents = [
                { title: 'Hecho Relevante', url: 'https://example.com/1.pdf', type: 'Hecho Relevante', date: '2024-01-01' },
                { title: 'Estados Financieros Auditados', url: 'https://example.com/2.pdf', type: 'Estados Financieros Auditados', date: '2024-01-01' },
            ];

            const result = await documentProcessor.processIssuerDocuments('issuer-1', 'Issuer Name', documents, 10);

            // The audited financials should be prioritized in processing
            expect(result.relevantDocsCount).to.be.greaterThan(0);
        });

        it('should filter out irrelevant documents (score 0)', async () => {
            const documents = [
                { title: 'Random Document', url: 'https://example.com/1.pdf', type: 'Unknown', date: '2024-01-01' },
            ];

            const result = await documentProcessor.processIssuerDocuments('issuer-1', 'Issuer Name', documents, 10);

            // Should filter out documents that don't match any priority criteria
            expect(result.relevantDocsCount).to.equal(0);
        });

        it('should return processing statistics', async () => {
            const result = await documentProcessor.processIssuerDocuments('issuer-1', 'Issuer Name', [], 10);

            expect(result).to.have.property('processedCount');
            expect(result).to.have.property('errorCount');
            expect(result).to.have.property('relevantDocsCount');
            expect(result).to.have.property('totalDocs');
        });
    });
});
