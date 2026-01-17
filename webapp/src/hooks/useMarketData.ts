import { useQuery } from '@tanstack/react-query';
import { fetchIssuers, fetchMetricsComparison } from '../utils/marketDataApi';
import type { Issuer } from '../types';

/**
 * Hook centralizado para datos del mercado.
 * Usa React Query para cachear y deduplicar llamadas automáticamente.
 * 
 * Esto elimina el problema de llamadas duplicadas entre MarketDashboard y RightPanel.
 */

// Datos mock de fallback (copiados de MarketDashboard para consistencia)
const MOCK_ISSUERS: Issuer[] = [
    { id: '1', name: 'Banco de Finanzas', acronym: 'BDF', sector: 'Privado', isActive: true, documents: [] },
    { id: '2', name: 'Compañía Cervecera', acronym: 'CCN', sector: 'Industrial', isActive: true, documents: [] },
    { id: '3', name: 'Grupo BAC Credomatic', acronym: 'BAC', sector: 'Financiero', isActive: true, documents: [] },
    { id: '4', name: 'Lafise Bancentro', acronym: 'LAFISE', sector: 'Financiero', isActive: true, documents: [] },
    { id: '5', name: 'Agricorp', acronym: 'AGRI', sector: 'Agroindustrial', isActive: true, documents: [] },
    { id: '6', name: 'Inversiones Financieras', acronym: 'INVERCASA', sector: 'Puesto de Bolsa', isActive: true, documents: [] },
    { id: '7', name: 'CrediFactor', acronym: 'CFACTOR', sector: 'Factoring', isActive: true, documents: [] },
];

/**
 * Hook principal para obtener la lista de emisores.
 * Cachea los resultados por 5 minutos para evitar llamadas repetidas.
 */
export function useIssuersData() {
    return useQuery({
        queryKey: ['market-issuers'],
        queryFn: async () => {
            try {
                const data = await fetchIssuers();
                const issuers = data.issuers || [];
                // Filtrar solo los activos
                return issuers.filter((i: any) => i.active !== false);
            } catch (error) {
                console.warn("API Connection Failed (Running in DEMO MODE):", error);
                // Fallback a datos mock en caso de error
                return MOCK_ISSUERS;
            }
        },
        staleTime: 5 * 60 * 1000, // 5 minutos
        retry: 1,
    });
}

/**
 * Hook para obtener métricas de comparación de múltiples emisores.
 * Solo se ejecuta cuando hay emisores disponibles.
 */
export function useMetricsComparison(issuerIds: string[]) {
    return useQuery({
        queryKey: ['market-metrics-comparison', issuerIds],
        queryFn: async () => {
            if (issuerIds.length === 0) return { comparison: [] };
            const response = await fetchMetricsComparison(issuerIds);
            return response;
        },
        enabled: issuerIds.length > 0,
        staleTime: 5 * 60 * 1000, // 5 minutos
        retry: 1,
    });
}

/**
 * Hook combinado que obtiene emisores y sus métricas.
 * Útil para componentes que necesitan ambos datos.
 */
export function useMarketData() {
    const issuersQuery = useIssuersData();
    const issuerIds = issuersQuery.data?.map(i => i.id) || [];
    const metricsQuery = useMetricsComparison(issuerIds);

    return {
        issuers: issuersQuery.data || [],
        issuersLoading: issuersQuery.isLoading,
        issuersError: issuersQuery.error,
        metrics: metricsQuery.data?.comparison || [],
        metricsLoading: metricsQuery.isLoading,
        metricsError: metricsQuery.error,
        isLoading: issuersQuery.isLoading || metricsQuery.isLoading,
    };
}
