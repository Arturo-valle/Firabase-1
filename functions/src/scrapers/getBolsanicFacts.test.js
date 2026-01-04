const chai = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire');
const { expect } = chai;

describe('Bolsanic Facts Scraper', () => {
    let scrapeBolsanicFacts;
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

    describe('scrapeBolsanicFacts', () => {
        it('should extract hechos relevantes from table structure', async () => {
            // HTML snapshot simulando la página de hechos relevantes
            const mockHtml = `
                <!DOCTYPE html>
                <html>
                <body>
                    <div class="et_pb_toggle_content">
                        <table class="tableHR">
                            <tbody>
                                <tr>
                                    <td>15/12/2024</td>
                                    <td>-</td>
                                    <td><a href="https://www.bolsanic.com/hecho/12345">BANPRO - Comunicación de Dividendos</a></td>
                                </tr>
                                <tr>
                                    <td>10/12/2024</td>
                                    <td>-</td>
                                    <td><a href="https://www.bolsanic.com/hecho/12346">BDF - Actualización de Calificación</a></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </body>
                </html>
            `;

            axiosMock.get.resolves({ data: mockHtml });

            const module = proxyquire('./getBolsanicFacts', {
                'axios': axiosMock,
                'firebase-functions': { logger: loggerMock }
            });

            const facts = await module.scrapeBolsanicFacts();

            expect(facts).to.be.an('array');
            expect(facts).to.have.lengthOf(2);

            // Verify fact structure
            expect(facts[0]).to.have.property('title');
            expect(facts[0]).to.have.property('url');
            expect(facts[0]).to.have.property('date');
            expect(facts[0]).to.have.property('issuerName');
            expect(facts[0]).to.have.property('type', 'Hecho Relevante');
        });

        it('should correctly parse issuer name using delimiter "-"', async () => {
            const mockHtml = `
                <!DOCTYPE html>
                <html>
                <body>
                    <div class="et_pb_toggle_content">
                        <table class="tableHR">
                            <tbody>
                                <tr>
                                    <td>01/01/2024</td>
                                    <td>-</td>
                                    <td><a href="https://example.com/1">BANPRO - Pago de Dividendos Cuarto Trimestre</a></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </body>
                </html>
            `;

            axiosMock.get.resolves({ data: mockHtml });

            const module = proxyquire('./getBolsanicFacts', {
                'axios': axiosMock,
                'firebase-functions': { logger: loggerMock }
            });

            const facts = await module.scrapeBolsanicFacts();

            expect(facts[0].issuerName).to.equal('BANPRO');
            expect(facts[0].title).to.equal('Pago de Dividendos Cuarto Trimestre');
        });

        it('should correctly parse issuer name using delimiter "–" (en dash)', async () => {
            const mockHtml = `
                <!DOCTYPE html>
                <html>
                <body>
                    <div class="et_pb_toggle_content">
                        <table class="tableHR">
                            <tbody>
                                <tr>
                                    <td>01/01/2024</td>
                                    <td>-</td>
                                    <td><a href="https://example.com/1">Financiera FAMA – Informe Trimestral</a></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </body>
                </html>
            `;

            axiosMock.get.resolves({ data: mockHtml });

            const module = proxyquire('./getBolsanicFacts', {
                'axios': axiosMock,
                'firebase-functions': { logger: loggerMock }
            });

            const facts = await module.scrapeBolsanicFacts();

            expect(facts[0].issuerName).to.equal('Financiera FAMA');
        });

        it('should correctly parse issuer name using delimiter ":"', async () => {
            const mockHtml = `
                <!DOCTYPE html>
                <html>
                <body>
                    <div class="et_pb_toggle_content">
                        <table class="tableHR">
                            <tbody>
                                <tr>
                                    <td>01/01/2024</td>
                                    <td>-</td>
                                    <td><a href="https://example.com/1">BDF: Comunicado Oficial</a></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </body>
                </html>
            `;

            axiosMock.get.resolves({ data: mockHtml });

            const module = proxyquire('./getBolsanicFacts', {
                'axios': axiosMock,
                'firebase-functions': { logger: loggerMock }
            });

            const facts = await module.scrapeBolsanicFacts();

            expect(facts[0].issuerName).to.equal('BDF');
        });

        it('should mark issuer as "Desconocido" when no delimiter found', async () => {
            const mockHtml = `
                <!DOCTYPE html>
                <html>
                <body>
                    <div class="et_pb_toggle_content">
                        <table class="tableHR">
                            <tbody>
                                <tr>
                                    <td>01/01/2024</td>
                                    <td>-</td>
                                    <td><a href="https://example.com/1">Comunicado sin emisor claro</a></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </body>
                </html>
            `;

            axiosMock.get.resolves({ data: mockHtml });

            const module = proxyquire('./getBolsanicFacts', {
                'axios': axiosMock,
                'firebase-functions': { logger: loggerMock }
            });

            const facts = await module.scrapeBolsanicFacts();

            expect(facts[0].issuerName).to.equal('Desconocido');
            expect(loggerMock.warn.called).to.be.true;
        });

        it('should clean issuer name by removing ", S.A." suffix', async () => {
            const mockHtml = `
                <!DOCTYPE html>
                <html>
                <body>
                    <div class="et_pb_toggle_content">
                        <table class="tableHR">
                            <tbody>
                                <tr>
                                    <td>01/01/2024</td>
                                    <td>-</td>
                                    <td><a href="https://example.com/1">Banco de la Producción, S.A. - Comunicado</a></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </body>
                </html>
            `;

            axiosMock.get.resolves({ data: mockHtml });

            const module = proxyquire('./getBolsanicFacts', {
                'axios': axiosMock,
                'firebase-functions': { logger: loggerMock }
            });

            const facts = await module.scrapeBolsanicFacts();

            expect(facts[0].issuerName).to.not.include('S.A.');
            expect(facts[0].issuerName).to.equal('Banco de la Producción');
        });

        it('should return empty array when no facts found', async () => {
            const mockHtml = `
                <!DOCTYPE html>
                <html>
                <body>
                    <div>No facts here</div>
                </body>
                </html>
            `;

            axiosMock.get.resolves({ data: mockHtml });

            const module = proxyquire('./getBolsanicFacts', {
                'axios': axiosMock,
                'firebase-functions': { logger: loggerMock }
            });

            const facts = await module.scrapeBolsanicFacts();

            expect(facts).to.be.an('array').that.is.empty;
            expect(loggerMock.warn.called).to.be.true;
        });

        it('should handle network errors gracefully', async () => {
            axiosMock.get.rejects(new Error('Server error'));

            const module = proxyquire('./getBolsanicFacts', {
                'axios': axiosMock,
                'firebase-functions': { logger: loggerMock }
            });

            const facts = await module.scrapeBolsanicFacts();

            expect(facts).to.be.an('array').that.is.empty;
            expect(loggerMock.error.called).to.be.true;
        });

        it('should preserve fullText for matching purposes', async () => {
            const mockHtml = `
                <!DOCTYPE html>
                <html>
                <body>
                    <div class="et_pb_toggle_content">
                        <table class="tableHR">
                            <tbody>
                                <tr>
                                    <td>01/01/2024</td>
                                    <td>-</td>
                                    <td><a href="https://example.com/1">BANPRO - Full Text Here</a></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </body>
                </html>
            `;

            axiosMock.get.resolves({ data: mockHtml });

            const module = proxyquire('./getBolsanicFacts', {
                'axios': axiosMock,
                'firebase-functions': { logger: loggerMock }
            });

            const facts = await module.scrapeBolsanicFacts();

            expect(facts[0]).to.have.property('fullText');
            expect(facts[0].fullText).to.equal('BANPRO - Full Text Here');
        });
    });
});
