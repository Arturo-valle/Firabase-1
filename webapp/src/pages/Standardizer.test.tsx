import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import Standardizer from './Standardizer';
import * as marketDataApi from '../utils/marketDataApi';

// Mock del componente hijo
vi.mock('../components/MetricsStandardizer', () => ({
    default: ({ issuers }: { issuers: any[] }) => (
        <div data-testid="metrics-standardizer">
            Metrics Standardizer Mock with {issuers.length} issuers
        </div>
    )
}));

describe('Standardizer Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renderiza el estado de carga inicialmente', () => {
        vi.spyOn(marketDataApi, 'fetchIssuers').mockReturnValue(new Promise(() => { })); // Nunca resuelve
        const { container } = render(<Standardizer />);
        expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    });

    it('renderiza el componente MetricsStandardizer después de cargar emisores', async () => {
        const mockIssuers = {
            issuers: [
                { id: 'fama', name: 'Financiera FAMA' },
                { id: 'banpro', name: 'Banpro' }
            ]
        };
        vi.spyOn(marketDataApi, 'fetchIssuers').mockResolvedValue(mockIssuers as any);

        render(<Standardizer />);

        await waitFor(() => {
            expect(screen.getByTestId('metrics-standardizer')).toBeInTheDocument();
            expect(screen.getByText(/with 2 issuers/i)).toBeInTheDocument();
        });
    });

    it('maneja errores en la carga de emisores', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        vi.spyOn(marketDataApi, 'fetchIssuers').mockRejectedValue(new Error('Fetch failed'));

        render(<Standardizer />);

        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalledWith('Failed to load issuers for standardizer:', expect.any(Error));
        });
    });
});
