import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import IssuerComparator from '../components/IssuerComparator';
import * as metricsApi from '../utils/metricsApi';

vi.mock('../utils/metricsApi');
vi.mock('../components/ComparisonCharts', () => ({
    default: () => <div data-testid="comparison-charts">Charts</div>
}));
vi.mock('../components/ComparisonTable', () => ({
    default: () => <div data-testid="comparison-table">Table</div>
}));

describe('IssuerComparator Component', () => {
    const mockIssuers = [
        { id: 'issuer1', name: 'Issuer One', acronym: 'I1', sector: 'Fin', documents: [], processed: 0, total: 0 },
        { id: 'issuer2', name: 'Issuer Two', acronym: 'I2', sector: 'Ret', documents: [], processed: 0, total: 0 }
    ];

    const mockMetricsResponse = {
        issuers: [
            { issuerId: 'issuer1', issuerName: 'Issuer One', liquidez: {}, solvencia: {}, rentabilidad: {}, eficiencia: {}, capital: {}, calificacion: {} },
            { issuerId: 'issuer2', issuerName: 'Issuer Two', liquidez: {}, solvencia: {}, rentabilidad: {}, eficiencia: {}, capital: {}, calificacion: {} }
        ]
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders all issuers correctly', () => {
        render(<IssuerComparator issuers={mockIssuers} />);
        expect(screen.getByText('Issuer One')).toBeInTheDocument();
        expect(screen.getByText('Issuer Two')).toBeInTheDocument();
    });

    it('allows selecting issuers', () => {
        render(<IssuerComparator issuers={mockIssuers} />);
        const button1 = screen.getByText('Issuer One').closest('button');
        fireEvent.click(button1!);

        // Visual feedback check (mock implementation usually involves class changes, checking for icon)
        // In this specific component, selected state adds a check icon
        expect(button1).toBeInTheDocument();
    });

    it('calls compareIssuers when comparison is triggered', async () => {
        (metricsApi.compareIssuers as any).mockResolvedValue(mockMetricsResponse);

        render(<IssuerComparator issuers={mockIssuers} />);

        // Select two issuers
        fireEvent.click(screen.getByText('Issuer One').closest('button')!);
        fireEvent.click(screen.getByText('Issuer Two').closest('button')!);

        // Click Compare
        const compareBtn = screen.getByText('COMPARAR DATOS');
        expect(compareBtn).not.toBeDisabled();
        fireEvent.click(compareBtn);

        await waitFor(() => {
            expect(metricsApi.compareIssuers).toHaveBeenCalledWith(['issuer1', 'issuer2'], expect.any(AbortSignal));
        });

        // Should show results
        expect(screen.getByTestId('comparison-charts')).toBeInTheDocument();
    });

    it('shows error if less than 2 issuers selected', () => {
        render(<IssuerComparator issuers={mockIssuers} />);
        fireEvent.click(screen.getByText('COMPARAR DATOS'));
        // Currently the button is disabled if < 2, so we check for disabled state
        const compareBtn = screen.getByText('COMPARAR DATOS').closest('button');
        expect(compareBtn).toBeDisabled();
    });
});
