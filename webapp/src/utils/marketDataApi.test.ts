import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchIssuers, fetchIssuerHistory } from './marketDataApi';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('marketDataApi', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it('debe llamar al endpoint de emisores y devolver la respuesta consolidada', async () => {
        const mockResponse = {
            issuers: [
                { id: 'agricorp-raw', name: 'Agricorp - Principal', documents: [{ url: 'doc1', date: '2024-01-01' }] },
                { id: 'invalid', name: 'Other Corp', documents: [] }
            ]
        };

        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => mockResponse
        });

        const result = await fetchIssuers();

        // Debe contener solo agricorp (whitelisted) y con ID normalizado
        expect(result.issuers).toHaveLength(1);
        expect(result.issuers[0].id).toBe('agricorp');
        expect(result.issuers[0].name).toBe('Agricorp');
    });

    it('debe llamar al endpoint de historial con el ID codificado', async () => {
        const mockHistory = [{ period: '2024-Q1', value: 100 }];

        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => mockHistory
        });

        const result = await fetchIssuerHistory('agricorp');
        expect(result).toEqual(mockHistory);
        expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/metrics/history/agricorp'), expect.any(Object));
    });

    it('debe lanzar error si la respuesta no es ok', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: false,
            status: 500,
            json: async () => ({ message: 'API Error' })
        });

        await expect(fetchIssuers()).rejects.toThrow('API Error');
    });
});
