import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ComparisonTable from '../components/ComparisonTable';
import type { IssuerMetrics } from '../types';

describe('ComparisonTable Component', () => {
    const mockMetrics: IssuerMetrics[] = [
        {
            issuerId: 'i1', issuerName: 'BankA',
            liquidez: { ratioCirculante: 1.5, pruebaAcida: 1.0, capitalTrabajo: 100 },
            solvencia: { deudaActivos: 0.5, deudaPatrimonio: 0.8, coberturIntereses: 5 },
            rentabilidad: { roe: 15, roa: 10, margenNeto: 20, utilidadNeta: 50 },
            eficiencia: { rotacionActivos: 1, rotacionCartera: 1, morosidad: 0 },
            capital: { activosTotales: 1000, patrimonio: 500, pasivos: 500 },
            calificacion: { rating: 'AAA', perspectiva: 'Stable', fecha: '' },
            metadata: { periodo: '2023', moneda: 'C$', fuente: '' }
        },
        {
            issuerId: 'i2', issuerName: 'BankB',
            liquidez: { ratioCirculante: 2.0, pruebaAcida: 1.5, capitalTrabajo: 200 },
            solvencia: { deudaActivos: 0.4, deudaPatrimonio: 0.6, coberturIntereses: 10 },
            rentabilidad: { roe: 12, roa: 8, margenNeto: 18, utilidadNeta: 40 },
            eficiencia: { rotacionActivos: 1, rotacionCartera: 1, morosidad: 0 },
            capital: { activosTotales: 1200, patrimonio: 600, pasivos: 600 },
            calificacion: { rating: 'AA', perspectiva: 'Stable', fecha: '' },
            metadata: { periodo: '2023', moneda: 'C$', fuente: '' }
        }
    ];

    it('renders without crashing', () => {
        render(<ComparisonTable issuers={mockMetrics} />);
        expect(screen.getByText('BankA')).toBeInTheDocument();
        expect(screen.getByText('BankB')).toBeInTheDocument();
    });

    it('renders metrics correctly', () => {
        render(<ComparisonTable issuers={mockMetrics} />);
        // ROE check: 15% and 12%
        expect(screen.getByText('15.00%')).toBeInTheDocument();
        expect(screen.getByText('12.00%')).toBeInTheDocument();
    });

    it('highlights best values correctly', () => {
        render(<ComparisonTable issuers={mockMetrics} highlightBest={true} />);

        // Issuer 1 has better ROE (15 vs 12)
        // We look for the cell containing 15.00% and check if it has the highlight class
        // Note: checking classes is brittle, but valid for checking conditional logic
        // Alternatively, check if the cell with 1.5 ratioCirculante (loser) does NOT have the class

        // Issuer 2 has better Ratio Circulante (2.0 vs 1.5)
        const winnerRatio = screen.getByText('2.00x');
        expect(winnerRatio.closest('td')).toHaveClass('text-accent-primary');

        const loserRatio = screen.getByText('1.50x');
        expect(loserRatio.closest('td')).not.toHaveClass('text-accent-primary');
    });
});
