const chai = require('chai');
const { expect } = chai;

// Import the module directly (no mocks needed for pure utility functions)
const { consolidateIssuers, WHITELIST, ALIAS_MAP, getBaseName } = require('./issuerConsolidation');

describe('Issuer Consolidation Utilities', () => {

    describe('getBaseName', () => {
        it('should normalize name to lowercase without accents', () => {
            expect(getBaseName('BANPRO')).to.equal('banpro');
            expect(getBaseName('Banco de la Producción')).to.equal('banpro');
        });

        it('should resolve aliases correctly', () => {
            expect(getBaseName('Banco de Finanzas')).to.equal('bdf');
            expect(getBaseName('Financiera FAMA')).to.equal('fama');
            expect(getBaseName('Financiera FDL')).to.equal('fdl');
        });

        it('should handle separators (-, –, —) by taking first part', () => {
            expect(getBaseName('BDF - Detalle Adicional')).to.equal('bdf');
            expect(getBaseName('FAMA – Información Extra')).to.equal('fama');
        });

        it('should handle parentheses by taking part before them', () => {
            expect(getBaseName('Banco de Finanzas (BDF)')).to.equal('bdf');
        });

        it('should handle comma separators', () => {
            expect(getBaseName('FID, Sociedad Anónima')).to.equal('fid');
        });

        it('should return empty string for null/undefined input', () => {
            expect(getBaseName(null)).to.equal('');
            expect(getBaseName(undefined)).to.equal('');
            expect(getBaseName('')).to.equal('');
        });

        it('should handle Horizonte variations', () => {
            expect(getBaseName('Horizonte')).to.equal('horizonte');
            expect(getBaseName('Horizonte Fondo de Inversion')).to.equal('horizonte');
            expect(getBaseName('Fondo Inversión Horizonte')).to.equal('horizonte');
        });

        it('should handle Agricorp variations', () => {
            expect(getBaseName('Agricorp')).to.equal('agricorp');
            expect(getBaseName('Corporacion Agricola')).to.equal('agricorp');
        });
    });

    describe('WHITELIST', () => {
        it('should contain all expected active issuers', () => {
            expect(WHITELIST).to.include('agricorp');
            expect(WHITELIST).to.include('banpro');
            expect(WHITELIST).to.include('bdf');
            expect(WHITELIST).to.include('fama');
            expect(WHITELIST).to.include('fdl');
            expect(WHITELIST).to.include('fid');
            expect(WHITELIST).to.include('horizonte');
        });

        it('should have exactly 7 whitelisted issuers', () => {
            expect(WHITELIST).to.have.lengthOf(7);
        });
    });

    describe('ALIAS_MAP', () => {
        it('should map all known aliases to canonical IDs', () => {
            expect(ALIAS_MAP['banco de la produccion']).to.equal('banpro');
            expect(ALIAS_MAP['banco de la producción']).to.equal('banpro');
            expect(ALIAS_MAP['banco de finanzas']).to.equal('bdf');
            expect(ALIAS_MAP['financiera fama']).to.equal('fama');
            expect(ALIAS_MAP['financiera fdl']).to.equal('fdl');
            expect(ALIAS_MAP['fid sociedad anonima']).to.equal('fid');
            expect(ALIAS_MAP['horizonte fondo de inversion']).to.equal('horizonte');
        });
    });

    describe('consolidateIssuers', () => {
        it('should consolidate duplicate issuers into single entries', () => {
            const issuers = [
                { name: 'Banco de la Producción', sector: 'Banca', documents: [] },
                { name: 'BANPRO', sector: 'Finanzas', documents: [{ url: 'doc1.pdf' }] },
                { name: 'Banpro', acronym: 'BPR', documents: [{ url: 'doc2.pdf' }] }
            ];

            const result = consolidateIssuers(issuers);

            // Should have only 1 consolidated issuer
            expect(result).to.have.lengthOf(1);
            expect(result[0].id).to.equal('banpro');
        });

        it('should merge documents from duplicate issuers', () => {
            const issuers = [
                { name: 'BANPRO', documents: [{ url: 'doc1.pdf', title: 'Doc 1' }] },
                { name: 'Banco de la Producción', documents: [{ url: 'doc2.pdf', title: 'Doc 2' }] }
            ];

            const result = consolidateIssuers(issuers);

            expect(result[0].documents).to.have.lengthOf(2);
        });

        it('should deduplicate documents by URL', () => {
            const issuers = [
                { name: 'BANPRO', documents: [{ url: 'same.pdf', title: 'Doc 1' }] },
                { name: 'Banco de la Producción', documents: [{ url: 'same.pdf', title: 'Doc 1 Duplicate' }] }
            ];

            const result = consolidateIssuers(issuers);

            // Should only have 1 unique document
            expect(result[0].documents).to.have.lengthOf(1);
        });

        it('should filter out issuers not in whitelist', () => {
            const issuers = [
                { name: 'BANPRO', documents: [] },
                { name: 'Unknown Company', documents: [] },
                { name: 'Random Issuer', documents: [] }
            ];

            const result = consolidateIssuers(issuers);

            // Should only have banpro
            expect(result).to.have.lengthOf(1);
            expect(result[0].id).to.equal('banpro');
        });

        it('should use canonical name and acronym from WHITELIST_CONFIG', () => {
            const issuers = [
                { name: 'banco de finanzas', acronym: 'wrong', documents: [] }
            ];

            const result = consolidateIssuers(issuers);

            expect(result[0].acronym).to.equal('BDF');
            expect(result[0].displayName).to.equal('Banco de Finanzas (BDF)');
        });

        it('should merge metadata (sector, logoUrl) when missing', () => {
            const issuers = [
                { name: 'BANPRO', documents: [] }, // No sector
                { name: 'Banco de la Producción', sector: 'Banking', logoUrl: 'logo.png', documents: [] }
            ];

            const result = consolidateIssuers(issuers);

            expect(result[0].sector).to.equal('Banking');
            expect(result[0].logoUrl).to.equal('logo.png');
        });

        it('should handle empty input array', () => {
            const result = consolidateIssuers([]);
            expect(result).to.be.an('array').that.is.empty;
        });

        it('should consolidate all 7 whitelisted issuers correctly', () => {
            const issuers = [
                { name: 'Agricorp', documents: [] },
                { name: 'BANPRO', documents: [] },
                { name: 'BDF', documents: [] },
                { name: 'Financiera FAMA', documents: [] },
                { name: 'Financiera FDL', documents: [] },
                { name: 'FID, Sociedad Anonima', documents: [] },
                { name: 'Horizonte Fondo de Inversion', documents: [] }
            ];

            const result = consolidateIssuers(issuers);

            expect(result).to.have.lengthOf(7);

            const ids = result.map(r => r.id);
            expect(ids).to.include('agricorp');
            expect(ids).to.include('banpro');
            expect(ids).to.include('bdf');
            expect(ids).to.include('fama');
            expect(ids).to.include('fdl');
            expect(ids).to.include('fid');
            expect(ids).to.include('horizonte');
        });
    });
});
