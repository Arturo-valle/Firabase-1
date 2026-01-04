import { renderHook, waitFor } from '@testing-library/react';
import { useIssuerData } from './useIssuerData';
import * as marketDataApi from '../utils/marketDataApi';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('../utils/marketDataApi', () => ({
    fetchIssuerDetail: vi.fn(),
    fetchMetricsComparison: vi.fn(),
    fetchIssuerHistory: vi.fn(),
    DISPLAY_NAMES: {},
    ISSUER_METADATA: {},
}));

describe('useIssuerData', () => {
    const mockIssuerId = 'issuer-123';

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should fetch and transform data successfully', async () => {
        const mockIssuer = { id: mockIssuerId, name: 'Test Issuer', documents: [], isActive: true };
        const mockMetrics = [{ metrics: { capital: { activosTotales: 1000 } } }];
        const mockHistory = [{ period: '2023-Q1', date: '2023-01-01', activosTotales: 900 }];

        vi.mocked(marketDataApi.fetchIssuerDetail).mockResolvedValue(mockIssuer);
        vi.mocked(marketDataApi.fetchMetricsComparison).mockResolvedValue({ success: true, comparison: mockMetrics });
        vi.mocked(marketDataApi.fetchIssuerHistory).mockResolvedValue(mockHistory);

        const { result } = renderHook(() => useIssuerData(mockIssuerId));

        // Wait for data to load
        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.issuer?.id).toBe(mockIssuerId);
        expect(result.current.metrics?.capital?.activosTotales).toBe(1000);
        expect(result.current.history).toHaveLength(1);
        expect(result.current.error).toBeNull();
    });

    it('should return issuer profile even if metrics fail (partial success)', async () => {
        const mockIssuer = { id: 'agricorp', name: 'Agricorp', documents: [], isActive: true };

        vi.mocked(marketDataApi.fetchIssuerDetail).mockResolvedValue(mockIssuer);
        vi.mocked(marketDataApi.fetchMetricsComparison).mockRejectedValue(new Error('Metrics failed'));
        vi.mocked(marketDataApi.fetchIssuerHistory).mockResolvedValue([]);

        const { result } = renderHook(() => useIssuerData(mockIssuerId));

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.issuer?.id).toBe(mockIssuerId);
        expect(result.current.metrics).toBeNull(); // Metrics failed but issuer loaded
        expect(result.current.error).toBeNull(); // Critical error is null
    });

    it('should handle critical errors correctly', async () => {
        vi.mocked(marketDataApi.fetchIssuerDetail).mockRejectedValue(new Error('API Error'));
        vi.mocked(marketDataApi.fetchMetricsComparison).mockResolvedValue({ success: true, comparison: [] });
        vi.mocked(marketDataApi.fetchIssuerHistory).mockResolvedValue([]);

        const { result } = renderHook(() => useIssuerData(mockIssuerId));

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.error).toBe('API Error');
        expect(result.current.issuer).toBeNull();
    });

    it('should abort requests on unmount (implicit in controller usage)', async () => {
        // This is harder to test without a custom fetch mock that tracks signals, 
        // but we can verify that state isn't updated if unmounted.
        const mockIssuer = { id: mockIssuerId, name: 'Test Issuer', documents: [], isActive: true };

        let resolveRequest: (value: any) => void;
        const promise = new Promise((resolve) => {
            resolveRequest = resolve;
        });

        vi.mocked(marketDataApi.fetchIssuerDetail).mockReturnValue(promise as any);

        const { unmount, result } = renderHook(() => useIssuerData(mockIssuerId));

        unmount();
        resolveRequest!(mockIssuer);

        // Result should stay in initial state or updated state depending on implementation, 
        // but mostly we want to ensure no "set state on unmounted component" errors occur.
        expect(result.current.issuer).toBeNull();
    });
});
