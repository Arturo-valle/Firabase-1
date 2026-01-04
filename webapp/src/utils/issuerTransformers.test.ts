import { describe, it, expect } from 'vitest';
import { getFrontendBaseName, consolidateIssuers, sanitizeIssuersList } from './issuerTransformers';

describe('issuerTransformers', () => {
    describe('getFrontendBaseName', () => {
        it('should normalize names to base IDs', () => {
            expect(getFrontendBaseName('Agricorp - Principal')).toBe('agricorp');
            expect(getFrontendBaseName('Corporación Agrícola')).toBe('agricorp');
            expect(getFrontendBaseName('Banco de la Producción')).toBe('banpro');
            expect(getFrontendBaseName('BANPRO (Sede Central)')).toBe('banpro');
        });

        it('should handle aliases', () => {
            expect(getFrontendBaseName('Banco de Finanzas')).toBe('bdf');
            expect(getFrontendBaseName('FID S.A')).toBe('fid');
        });
    });

    describe('consolidateIssuers', () => {
        it('should filter non-whitelisted issuers', () => {
            const raw = [
                { name: 'Agricorp', documents: [] },
                { name: 'Random Corp', documents: [] }
            ];
            const result = consolidateIssuers(raw);
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('agricorp');
        });

        it('should consolidate duplicate issuers pointing to the same baseId', () => {
            const raw = [
                { name: 'Agricorp', documents: [{ url: 'doc1', title: 'Doc 1' }] },
                { name: 'Corporacion Agricola', documents: [{ url: 'doc2', title: 'Doc 2' }] }
            ];
            const result = consolidateIssuers(raw);
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('agricorp');
            expect(result[0].documents).toHaveLength(2);
        });
    });

    describe('sanitizeIssuersList', () => {
        it('should add display names and acronyms from metadata', () => {
            const raw = [
                { id: 'agricorp', name: 'Raw Name' },
                { id: 'banpro', name: 'Raw Bank' }
            ];
            const result = sanitizeIssuersList(raw);
            expect(result[0].name).toBe('Agricorp');
            expect(result[0].acronym).toBe('AGRI');
            expect(result[1].name).toBe('Banpro');
            expect(result[1].acronym).toBe('BANPRO');
        });
    });
});
