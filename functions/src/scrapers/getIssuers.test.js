const chai = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();
const { expect } = chai;

describe('Issuers Scraper', () => {
    let getIssuersModule;
    let axiosMock;
    let loggerMock;
    let batchMock;
    let firestoreMock;
    let adminMock;

    beforeEach(() => {
        loggerMock = {
            info: sinon.stub(),
            warn: sinon.stub(),
            error: sinon.stub(),
        };

        axiosMock = {
            get: sinon.stub()
        };

        // Mock Firestore batch
        batchMock = {
            set: sinon.stub(),
            commit: sinon.stub().resolves()
        };

        // Mock Firestore with FieldValue
        firestoreMock = {
            collection: sinon.stub().returnsThis(),
            doc: sinon.stub().returnsThis(),
            batch: sinon.stub().returns(batchMock),
            FieldValue: {
                serverTimestamp: sinon.stub().returns('mock-timestamp')
            }
        };

        // Mock firebase-admin correctly
        adminMock = {
            apps: [{}], // Pretend already initialized so initializeApp is not called
            firestore: function () { return firestoreMock; },
            initializeApp: sinon.stub()
        };

        // Add FieldValue as a static property of firestore function
        adminMock.firestore.FieldValue = firestoreMock.FieldValue;
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('scrapeIssuers', () => {
        it('should extract issuers from blurb cards and save to Firestore', async () => {
            const mockHtml = `
                <!DOCTYPE html>
                <html>
                <body>
                    <div class="et_pb_blurb">
                        <h4 class="et_pb_module_header">
                            <a href="https://www.bolsanic.com/emisor-banpro/">Banco de la Producción (BANPRO)</a>
                        </h4>
                    </div>
                    <div class="et_pb_blurb">
                        <h4 class="et_pb_module_header">
                            <a href="https://www.bolsanic.com/emisor-bdf/">Banco de Finanzas (BDF)</a>
                        </h4>
                    </div>
                </body>
                </html>
            `;

            axiosMock.get.resolves({ data: mockHtml });

            getIssuersModule = proxyquire('./getIssuers', {
                'axios': axiosMock,
                'firebase-functions': { logger: loggerMock },
                'firebase-admin': adminMock
            });

            const issuers = await getIssuersModule.scrapeIssuers();

            expect(issuers).to.be.an('array');
            expect(issuers.length).to.be.gte(2);
            expect(batchMock.commit.called).to.be.true;
        });

        it('should extract acronym from parentheses in name', async () => {
            const mockHtml = `
                <!DOCTYPE html>
                <html>
                <body>
                    <div class="et_pb_blurb">
                        <h4 class="et_pb_module_header">
                            <a href="https://www.bolsanic.com/emisor-test/">Financiera FAMA (FAMA)</a>
                        </h4>
                    </div>
                </body>
                </html>
            `;

            axiosMock.get.resolves({ data: mockHtml });

            getIssuersModule = proxyquire('./getIssuers', {
                'axios': axiosMock,
                'firebase-functions': { logger: loggerMock },
                'firebase-admin': adminMock
            });

            const issuers = await getIssuersModule.scrapeIssuers();

            expect(issuers.length).to.be.gte(1);
            const fama = issuers.find(i => i.acronym === 'FAMA');
            expect(fama).to.exist;
            expect(fama.name).to.equal('Financiera FAMA');
        });

        it('should clean issuer name by removing ", S.A." suffix', async () => {
            const mockHtml = `
                <!DOCTYPE html>
                <html>
                <body>
                    <div class="et_pb_blurb">
                        <h4 class="et_pb_module_header">
                            <a href="https://www.bolsanic.com/emisor-test/">Banco Test, S.A. (TEST)</a>
                        </h4>
                    </div>
                </body>
                </html>
            `;

            axiosMock.get.resolves({ data: mockHtml });

            getIssuersModule = proxyquire('./getIssuers', {
                'axios': axiosMock,
                'firebase-functions': { logger: loggerMock },
                'firebase-admin': adminMock
            });

            const issuers = await getIssuersModule.scrapeIssuers();

            expect(issuers.length).to.be.gte(1);
            expect(issuers[0].name).to.not.include(', S.A.');
        });

        it('should extract inactive issuers from ul list', async () => {
            const mockHtml = `
                <!DOCTYPE html>
                <html>
                <body>
                    <div class="et_pb_text_11">
                        <div class="et_pb_text_inner">
                            <ul>
                                <li>Empresa Inactiva, S.A.</li>
                                <li>Otra Empresa Inactiva</li>
                            </ul>
                        </div>
                    </div>
                </body>
                </html>
            `;

            axiosMock.get.resolves({ data: mockHtml });

            getIssuersModule = proxyquire('./getIssuers', {
                'axios': axiosMock,
                'firebase-functions': { logger: loggerMock },
                'firebase-admin': adminMock
            });

            const issuers = await getIssuersModule.scrapeIssuers();

            const inactiveIssuers = issuers.filter(i => i.active === false);
            expect(inactiveIssuers.length).to.equal(2);
            expect(inactiveIssuers[0].sector).to.equal('Inactivo');
        });

        it('should deduplicate issuers by URL', async () => {
            const mockHtml = `
                <!DOCTYPE html>
                <html>
                <body>
                    <div class="et_pb_blurb">
                        <h4 class="et_pb_module_header">
                            <a href="https://www.bolsanic.com/emisor-test/">Banco Test (TEST)</a>
                        </h4>
                    </div>
                    <div class="et_pb_blurb">
                        <h4 class="et_pb_module_header">
                            <a href="https://www.bolsanic.com/emisor-test/">Banco Test Duplicado (TEST2)</a>
                        </h4>
                    </div>
                </body>
                </html>
            `;

            axiosMock.get.resolves({ data: mockHtml });

            getIssuersModule = proxyquire('./getIssuers', {
                'axios': axiosMock,
                'firebase-functions': { logger: loggerMock },
                'firebase-admin': adminMock
            });

            const issuers = await getIssuersModule.scrapeIssuers();

            // Should only have 1 issuer with that URL (duplicates removed)
            const testIssuers = issuers.filter(i => i.detailUrl === 'https://www.bolsanic.com/emisor-test/');
            expect(testIssuers).to.have.lengthOf(1);
        });

        it('should handle network errors gracefully', async () => {
            axiosMock.get.rejects(new Error('Network error'));

            getIssuersModule = proxyquire('./getIssuers', {
                'axios': axiosMock,
                'firebase-functions': { logger: loggerMock },
                'firebase-admin': adminMock
            });

            const issuers = await getIssuersModule.scrapeIssuers();

            expect(issuers).to.be.an('array').that.is.empty;
            expect(loggerMock.error.called).to.be.true;
        });

        it('should commit batch to Firestore after successful scraping', async () => {
            const mockHtml = `
                <!DOCTYPE html>
                <html>
                <body>
                    <div class="et_pb_blurb">
                        <h4 class="et_pb_module_header">
                            <a href="https://www.bolsanic.com/emisor-banpro/">BANPRO (BANPRO)</a>
                        </h4>
                    </div>
                </body>
                </html>
            `;

            axiosMock.get.resolves({ data: mockHtml });

            getIssuersModule = proxyquire('./getIssuers', {
                'axios': axiosMock,
                'firebase-functions': { logger: loggerMock },
                'firebase-admin': adminMock
            });

            await getIssuersModule.scrapeIssuers();

            expect(batchMock.commit.called).to.be.true;
        });

        it('should set issuer active status correctly', async () => {
            const mockHtml = `
                <!DOCTYPE html>
                <html>
                <body>
                    <div class="et_pb_blurb">
                        <h4 class="et_pb_module_header">
                            <a href="https://www.bolsanic.com/emisor-active/">Active Issuer (ACT)</a>
                        </h4>
                    </div>
                </body>
                </html>
            `;

            axiosMock.get.resolves({ data: mockHtml });

            getIssuersModule = proxyquire('./getIssuers', {
                'axios': axiosMock,
                'firebase-functions': { logger: loggerMock },
                'firebase-admin': adminMock
            });

            const issuers = await getIssuersModule.scrapeIssuers();

            const activeIssuer = issuers.find(i => i.acronym === 'ACT');
            expect(activeIssuer).to.exist;
            expect(activeIssuer.active).to.be.true;
        });
    });
});
