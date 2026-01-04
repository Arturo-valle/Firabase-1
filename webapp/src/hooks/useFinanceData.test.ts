import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useFinanceData } from './useFinanceData';
import { useIssuers } from './useIssuers';

vi.mock('./useIssuers', () => ({
    useIssuers: vi.fn(),
}));

describe('useFinanceData', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe inicializar con estado de carga', () => {
        (useIssuers as any).mockReturnValue({
            issuers: [],
            loading: true,
            error: null
        });
        const { result } = renderHook(() => useFinanceData());
        expect(result.current.loading).toBe(true);
        expect(result.current.issuers).toEqual([]);
    });

    it('debe transformar datos de useIssuers exitosamente', async () => {
        const mockIssuers = [
            {
                id: 'agricorp',
                name: 'Agricorp',
                documents: [
                    { title: 'Doc 1', url: 'url1', date: '2024-01-01', type: 'HR' }
                ],
                sector: 'Industria',
                acronym: 'AGRI'
            }
        ];

        (useIssuers as any).mockReturnValue({
            issuers: mockIssuers,
            loading: false,
            error: null
        });

        const { result } = renderHook(() => useFinanceData());

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
            expect(result.current.issuers).toHaveLength(1);
            expect(result.current.issuers[0].id).toBe('agricorp');
            expect(result.current.stats?.totalProcessedDocs).toBe(1);
        });
    });

    it('debe manejar errores provenientes de useIssuers', () => {
        const mockError = new Error('Error de prueba');
        (useIssuers as any).mockReturnValue({
            issuers: [],
            loading: false,
            error: mockError
        });

        const { result } = renderHook(() => useFinanceData());
        expect(result.current.error).toBe(mockError);
    });
});
