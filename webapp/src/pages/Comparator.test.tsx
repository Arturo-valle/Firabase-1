import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Comparator from './Comparator';
import * as marketDataApi from '../utils/marketDataApi';

// Mocks
vi.mock('../utils/marketDataApi');
vi.mock('../components/ComparisonCharts', () => ({
    default: () => <div data-testid="comparison-charts">Charts</div>
}));
vi.mock('../components/ComparisonTable', () => ({
    default: () => <div data-testid="comparison-table">Table</div>
}));

describe('Comparator Page', () => {
    const mockIssuers = {
        issuers: [
            { id: 'issuer1', name: 'Issuer One', acronym: 'I1', sector: 'Finance', documents: [{ title: 'Doc 1', url: 'http://url', type: 'Report', date: '2023-01-01' }] },
            { id: 'issuer2', name: 'Issuer Two', acronym: 'I2', sector: 'Retail', documents: [{ title: 'Doc 2', url: 'http://url', type: 'Report', date: '2023-01-01' }] },
            { id: 'issuer3', name: 'Issuer Three', acronym: 'I3', sector: 'Tech', documents: [{ title: 'Doc 3', url: 'http://url', type: 'Report', date: '2023-01-01' }] }
        ]
    };

    beforeEach(() => {
        vi.clearAllMocks();
        (marketDataApi.fetchIssuers as any).mockResolvedValue(mockIssuers);
    });

    it('renders loading state initially', () => {
        render(<Comparator />);
        expect(screen.getByText(/Cargando comparador/i)).toBeInTheDocument();
    });

    it('renders issuer selection list after loading', async () => {
        render(<Comparator />);

        await waitFor(() => {
            expect(screen.queryByText(/Cargando comparador/i)).not.toBeInTheDocument();
        });

        expect(screen.getByText('Issuer One')).toBeInTheDocument();
        expect(screen.getByText('Issuer Two')).toBeInTheDocument();
    });

    it('handles issuer fetch error gracefully', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        (marketDataApi.fetchIssuers as any).mockRejectedValue(new Error('Fetch error'));

        render(<Comparator />);

        await waitFor(() => {
            expect(screen.queryByText(/Cargando comparador/i)).not.toBeInTheDocument();
        });

        // Should still render the main container likely empty or with error handling in the child
        // In the current implementation of Comparator.tsx, it just logs error and stops loading
        // So the list might be empty, but it shouldn't crash
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });
});
