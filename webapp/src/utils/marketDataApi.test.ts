import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchIssuers, fetchIssuerDetail } from './marketDataApi';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('marketDataApi', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2025-12-14')); // Ensure consistent date for "recency" checks
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should only return whitelisted issuers in strict mode', async () => {
        // Mock API response with mixed issuers
        const mockResponse = {
            issuers: [
                { id: 'bdf', name: 'BDF', documents: [{ date: '2025-01-01', url: 'http://example.com/doc1' }] }, // Whitelisted
                { id: 'banpro', name: 'Banpro', documents: [{ date: '2025-01-01', url: 'http://example.com/doc2' }] }, // Whitelisted
                { id: 'unknown_bank', name: 'Unknown Bank', documents: [{ date: '2025-01-01', url: 'http://example.com/doc3' }] } // NOT Whitelisted
            ]
        };

        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => mockResponse
        });

        const result = await fetchIssuers();

        // Check complete list
        const ids = result.issuers.map(i => i.id);

        expect(ids).toContain('bdf');
        expect(ids).toContain('banpro');
        expect(ids).not.toContain('unknown_bank'); // Strict Whitelist check
    });

    it('should deduce ID from name if ID is missing (Frontend Logic)', async () => {
        // The current implementation derives ID from name if not present or needs normalization
        const mockResponse = {
            issuers: [
                { name: 'Financiera FAMA', documents: [{ date: '2025-01-01', url: 'http://doc' }] }
            ]
        };

        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => mockResponse
        });

        const result = await fetchIssuers();
        expect(result.issuers[0].id).toBe('fama'); // Should normalize 'Financiera FAMA' -> 'fama'
    });

    it('should reject issuers not in the code-defined WHITELIST (Adaptability Check)', async () => {
        // This test explicitly confirms that a NEW valid issuer is BLOCKED by default code
        // If we want adaptability, this test failing (or passing if we expect blockage) is the key signal.
        const mockResponse = {
            issuers: [
                { name: 'New Valid Bank', documents: [{ date: '2025-01-01', url: 'http://doc' }] }
            ]
        };

        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => mockResponse
        });

        const result = await fetchIssuers();
        // Currently, we expect this to be empty because 'new valid bank' is not in the hardcoded WHITELIST
        expect(result.issuers).toHaveLength(0);
    });

    it('should fetch issuer detail successfully', async () => {
        const mockDetail = { id: 'bdf', name: 'BDF', documents: [] };
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => mockDetail
        });

        const result = await fetchIssuerDetail('bdf');
        expect(result.id).toBe('bdf');
        expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/issuer/bdf'));
    });

    it('should throw error when fetching non-existent issuer detail', async () => {
        mockFetch.mockResolvedValue({
            ok: false,
            status: 404
        });

        await expect(fetchIssuerDetail('nonexistent')).rejects.toThrow('Failed to fetch issuer: nonexistent');
    });
});
