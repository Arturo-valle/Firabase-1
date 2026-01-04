const chai = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire');
const { expect } = chai;

describe('Bolsanic Documents Scraper', () => {
    let scrapeBolsanicDocuments;
    let axiosMock;
    let loggerMock;

    beforeEach(() => {
        loggerMock = {
            info: sinon.stub(),
            warn: sinon.stub(),
            error: sinon.stub(),
        };

        axiosMock = {
            get: sinon.stub()
        };
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('scrapeBolsanicDocuments', () => {
        it('should extract documents from .lsa-open links (new structure)', async () => {
            // HTML snapshot simulando la página de detalle de emisor
            const mockHtml = `
                <!DOCTYPE html>
                <html>
                <body>
                    <a class="lsa-open" data-url="https://www.bolsanic.com/?lsa_pdf_id=12345" href="#">
                        Estados Financieros Auditados DIC 2024
                    </a>
                    <a class="lsa-open" data-url="https://www.bolsanic.com/?lsa_pdf_id=12346" href="#">
                        Prospecto de Emisión 2024
                    </a>
                    <a class="lsa-open" data-url="https://www.bolsanic.com/?lsa_pdf_id=12347" href="#">
                        Calificación de Riesgo MAR 2025
                    </a>
                </body>
                </html>
            `;

            axiosMock.get.resolves({ data: mockHtml });

            const module = proxyquire('./getBolsanicDocuments', {
                'axios': axiosMock,
                'firebase-functions': { logger: loggerMock }
            });

            const docs = await module.scrapeBolsanicDocuments('https://www.bolsanic.com/emisor-test/');

            expect(docs).to.be.an('array');
            expect(docs).to.have.lengthOf(3);

            // Verify document structure
            expect(docs[0]).to.have.property('title');
            expect(docs[0]).to.have.property('url');
            expect(docs[0]).to.have.property('date');
            expect(docs[0]).to.have.property('type');
        });

        it('should correctly identify document types from titles', async () => {
            const mockHtml = `
                <!DOCTYPE html>
                <html>
                <body>
                    <a class="lsa-open" data-url="https://example.com/1.pdf" href="#">
                        Estados Financieros 2024
                    </a>
                    <a class="lsa-open" data-url="https://example.com/2.pdf" href="#">
                        Prospecto de Emisión
                    </a>
                    <a class="lsa-open" data-url="https://example.com/3.pdf" href="#">
                        Hecho Relevante - Pago de Dividendos
                    </a>
                    <a class="lsa-open" data-url="https://example.com/4.pdf" href="#">
                        Calificación de Riesgo
                    </a>
                </body>
                </html>
            `;

            axiosMock.get.resolves({ data: mockHtml });

            const module = proxyquire('./getBolsanicDocuments', {
                'axios': axiosMock,
                'firebase-functions': { logger: loggerMock }
            });

            const docs = await module.scrapeBolsanicDocuments('https://www.bolsanic.com/emisor-test/');

            expect(docs[0].type).to.equal('Estados Financieros');
            expect(docs[1].type).to.equal('Prospecto');
            expect(docs[2].type).to.equal('Hecho Relevante');
            expect(docs[3].type).to.equal('Calificación de Riesgo');
        });

        it('should extract dates from titles when available', async () => {
            const mockHtml = `
                <!DOCTYPE html>
                <html>
                <body>
                    <a class="lsa-open" data-url="https://example.com/1.pdf" href="#">
                        Estados Financieros DIC 2024
                    </a>
                    <a class="lsa-open" data-url="https://example.com/2.pdf" href="#">
                        Informe MAR 2023
                    </a>
                </body>
                </html>
            `;

            axiosMock.get.resolves({ data: mockHtml });

            const module = proxyquire('./getBolsanicDocuments', {
                'axios': axiosMock,
                'firebase-functions': { logger: loggerMock }
            });

            const docs = await module.scrapeBolsanicDocuments('https://www.bolsanic.com/emisor-test/');

            // Should have extracted dates with year and month
            expect(docs[0].date).to.include('2024');
            expect(docs[0].date).to.include('12'); // DIC = 12
            expect(docs[1].date).to.include('2023');
            expect(docs[1].date).to.include('03'); // MAR = 03
        });

        it('should fallback to old selector when no .lsa-open links found', async () => {
            const mockHtml = `
                <!DOCTYPE html>
                <html>
                <body>
                    <table>
                        <tr>
                            <td>01/01/2024</td>
                            <td>Estados Financieros</td>
                            <td><a class="btn btn-primary btn-sm w-100 mb-2" href="https://example.com/doc.pdf">Descargar</a></td>
                        </tr>
                    </table>
                </body>
                </html>
            `;

            axiosMock.get.resolves({ data: mockHtml });

            const module = proxyquire('./getBolsanicDocuments', {
                'axios': axiosMock,
                'firebase-functions': { logger: loggerMock }
            });

            const docs = await module.scrapeBolsanicDocuments('https://www.bolsanic.com/emisor-test/');

            expect(docs).to.be.an('array');
            expect(docs.length).to.be.gte(0);
        });

        it('should return empty array for empty/null URL', async () => {
            const module = proxyquire('./getBolsanicDocuments', {
                'axios': axiosMock,
                'firebase-functions': { logger: loggerMock }
            });

            const docs1 = await module.scrapeBolsanicDocuments('');
            const docs2 = await module.scrapeBolsanicDocuments(null);

            expect(docs1).to.be.an('array').that.is.empty;
            expect(docs2).to.be.an('array').that.is.empty;
        });

        it('should handle network errors gracefully', async () => {
            axiosMock.get.rejects(new Error('Connection refused'));

            const module = proxyquire('./getBolsanicDocuments', {
                'axios': axiosMock,
                'firebase-functions': { logger: loggerMock }
            });

            const docs = await module.scrapeBolsanicDocuments('https://www.bolsanic.com/emisor-test/');

            expect(docs).to.be.an('array').that.is.empty;
            expect(loggerMock.error.called).to.be.true;
        });

        it('should skip links with href="#" only (no data-url)', async () => {
            const mockHtml = `
                <!DOCTYPE html>
                <html>
                <body>
                    <a class="lsa-open" href="#">Empty Link</a>
                    <a class="lsa-open" data-url="https://example.com/valid.pdf" href="#">Valid Doc</a>
                </body>
                </html>
            `;

            axiosMock.get.resolves({ data: mockHtml });

            const module = proxyquire('./getBolsanicDocuments', {
                'axios': axiosMock,
                'firebase-functions': { logger: loggerMock }
            });

            const docs = await module.scrapeBolsanicDocuments('https://www.bolsanic.com/emisor-test/');

            expect(docs).to.have.lengthOf(1);
            expect(docs[0].title).to.equal('Valid Doc');
        });
    });
});
