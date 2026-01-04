const chai = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire');
const { expect } = chai;

describe('BCN Rates Scraper', () => {
    let scrapeBcnExchangeRate;
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

    describe('scrapeBcnExchangeRate', () => {
        it('should extract exchange rate from valid HTML', async () => {
            // HTML snapshot simulando la página del BCN
            const mockHtml = `
                <!DOCTYPE html>
                <html>
                <head><title>BCN - Tipo de Cambio</title></head>
                <body>
                    <div class="kpi-value">36.6243</div>
                </body>
                </html>
            `;

            axiosMock.get.resolves({ data: mockHtml });

            const module = proxyquire('./getBcnRates', {
                'axios': axiosMock,
                'firebase-functions': { logger: loggerMock }
            });

            const rate = await module.scrapeBcnExchangeRate();

            expect(rate).to.be.a('number');
            expect(rate).to.be.closeTo(36.6243, 0.001);
        });

        it('should return null when rate element is missing', async () => {
            const mockHtml = `
                <!DOCTYPE html>
                <html>
                <body>
                    <div class="other-element">No rate here</div>
                </body>
                </html>
            `;

            axiosMock.get.resolves({ data: mockHtml });

            const module = proxyquire('./getBcnRates', {
                'axios': axiosMock,
                'firebase-functions': { logger: loggerMock }
            });

            const rate = await module.scrapeBcnExchangeRate();

            expect(rate).to.be.null;
            expect(loggerMock.error.called).to.be.true;
        });

        it('should return null when rate is not a valid number', async () => {
            const mockHtml = `
                <!DOCTYPE html>
                <html>
                <body>
                    <div class="kpi-value">N/A</div>
                </body>
                </html>
            `;

            axiosMock.get.resolves({ data: mockHtml });

            const module = proxyquire('./getBcnRates', {
                'axios': axiosMock,
                'firebase-functions': { logger: loggerMock }
            });

            const rate = await module.scrapeBcnExchangeRate();

            expect(rate).to.be.null;
        });

        it('should handle network errors gracefully', async () => {
            axiosMock.get.rejects(new Error('Network timeout'));

            const module = proxyquire('./getBcnRates', {
                'axios': axiosMock,
                'firebase-functions': { logger: loggerMock }
            });

            const rate = await module.scrapeBcnExchangeRate();

            expect(rate).to.be.null;
            expect(loggerMock.error.called).to.be.true;
        });

        it('should include User-Agent header in request', async () => {
            axiosMock.get.resolves({ data: '<div class="kpi-value">36.00</div>' });

            const module = proxyquire('./getBcnRates', {
                'axios': axiosMock,
                'firebase-functions': { logger: loggerMock }
            });

            await module.scrapeBcnExchangeRate();

            const requestOptions = axiosMock.get.firstCall.args[1];
            expect(requestOptions.headers['User-Agent']).to.exist;
        });
    });
});
