import { useMemo } from 'react';
import type { IssuerMetrics } from '../types';

export interface RadarData {
    dimension: string;
    [key: string]: string | number;
}

export interface BarData {
    name: string;
    [key: string]: string | number;
}

export function useComparatorData(issuers: IssuerMetrics[]) {
    // Transform data for Radar Chart (Performance Comparison)
    const radarData = useMemo(() => {
        if (issuers.length === 0) return [];

        const maxAssets = Math.max(...issuers.map(i => i.capital.activosTotales || 1));

        return [
            {
                dimension: 'Liquidez',
                ...issuers.reduce((acc, issuer) => ({
                    ...acc,
                    [issuer.issuerName]: issuer.liquidez.ratioCirculante || 0
                }), {})
            },
            {
                dimension: 'Solvencia',
                ...issuers.reduce((acc, issuer) => ({
                    ...acc,
                    [issuer.issuerName]: issuer.solvencia.coberturIntereses ? Math.min(issuer.solvencia.coberturIntereses, 10) : 0
                }), {})
            },
            {
                dimension: 'Rentabilidad',
                ...issuers.reduce((acc, issuer) => ({
                    ...acc,
                    [issuer.issuerName]: issuer.rentabilidad.roe ? issuer.rentabilidad.roe / 2 : 0 // Normalize % to 10 scale
                }), {})
            },
            {
                dimension: 'Eficiencia',
                ...issuers.reduce((acc, issuer) => ({
                    ...acc,
                    [issuer.issuerName]: issuer.eficiencia.rotacionActivos ? issuer.eficiencia.rotacionActivos * 2 : 0
                }), {})
            },
            {
                dimension: 'Capitalización',
                ...issuers.reduce((acc, issuer) => ({
                    ...acc,
                    [issuer.issuerName]: issuer.capital.activosTotales ?
                        (issuer.capital.activosTotales / maxAssets) * 10 : 0
                }), {})
            }
        ];
    }, [issuers]);

    // Transform data for Profitability Bars
    const roeData = useMemo(() => {
        return issuers.map(issuer => ({
            name: issuer.issuerName.length > 15 ? issuer.issuerName.substring(0, 15) + '...' : issuer.issuerName,
            ROE: issuer.rentabilidad.roe || 0,
            ROA: issuer.rentabilidad.roa || 0,
        }));
    }, [issuers]);

    // Transform data for Capital Structure
    const capitalData = useMemo(() => {
        return issuers.map(issuer => ({
            name: issuer.issuerName.length > 15 ? issuer.issuerName.substring(0, 15) + '...' : issuer.issuerName,
            Activos: issuer.capital.activosTotales || 0,
            Patrimonio: issuer.capital.patrimonio || 0,
            Pasivos: issuer.capital.pasivos || 0,
        }));
    }, [issuers]);

    // Transform data for Liquidity Bars
    const liquidityData = useMemo(() => {
        return issuers.map(issuer => ({
            name: issuer.issuerName.length > 15 ? issuer.issuerName.substring(0, 15) + '...' : issuer.issuerName,
            'Ratio Circulante': issuer.liquidez.ratioCirculante || 0,
            'Prueba Ácida': issuer.liquidez.pruebaAcida || 0,
        }));
    }, [issuers]);

    return {
        radarData,
        roeData,
        capitalData,
        liquidityData
    };
}
