const { expect } = require('chai');
const { normalizeIssuerName } = require('./normalization');

describe('normalizeIssuerName', () => {
    it('debe normalizar nombres eliminando acentos y mayúsculas', () => {
        expect(normalizeIssuerName('MÉXICO')).to.equal('mexico');
    });

    it('debe eliminar sufijos comunes como S.A.', () => {
        expect(normalizeIssuerName('Empresa, S.A.')).to.equal('empresa');
    });

    it('debe eliminar contenido entre paréntesis', () => {
        expect(normalizeIssuerName('Banco (Nicaragua)')).to.equal('banco');
    });

    it('debe manejar entradas vacías', () => {
        expect(normalizeIssuerName('')).to.equal('');
        expect(normalizeIssuerName(null)).to.equal('');
    });
});
