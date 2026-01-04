import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useComparatorData } from './useComparatorData';
import type { IssuerMetrics } from '../types';

describe('useComparatorData Hook', () => {
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
        }
    ];

    it('transforms radar data correctly', () => {
        const { result } = renderHook(() => useComparatorData(mockMetrics));

        const radar = result.current.radarData;
        expect(radar).toHaveLength(5);

        const liquidityDim = radar.find(d => d.dimension === 'Liquidez');
        expect((liquidityDim as any)?.BankA).toBe(1.5);

        const profitabilityDim = radar.find(d => d.dimension === 'Rentabilidad');
        expect((profitabilityDim as any)?.BankA).toBe(7.5); // 15 / 2
    });

    it('transforms bar data correctly', () => {
        const { result } = renderHook(() => useComparatorData(mockMetrics));

        expect(result.current.roeData[0].ROE).toBe(15);
        expect(result.current.capitalData[0].Activos).toBe(1000);
    });

    it('handles empty input', () => {
        const { result } = renderHook(() => useComparatorData([]));
        expect(result.current.radarData).toEqual([]);
        expect(result.current.roeData).toEqual([]);
    });
});
