import { useState, useEffect } from 'react';
import { fetchIssuerDetail, fetchIssuerHistory, fetchIssuerMetrics } from '../utils/marketDataApi';
import { transformIssuer } from '../utils/issuerTransformers';
import type { Issuer, IssuerMetrics, HistoricalPoint } from '../types';

export interface UseIssuerDataResult {
    issuer: Issuer | null;
    metrics: IssuerMetrics | null;
    history: HistoricalPoint[];
    loading: boolean;
    error: string | null;
}

/**
 * Custom hook to load all necessary data for an issuer detail view.
 * Fetches profile, metrics, and history in parallel.
 * Handles race conditions and cleanup.
 */
export function useIssuerData(issuerId: string | undefined): UseIssuerDataResult {
    const [issuer, setIssuer] = useState<Issuer | null>(null);
    const [metrics, setMetrics] = useState<IssuerMetrics | null>(null);
    const [history, setHistory] = useState<HistoricalPoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!issuerId) return;

        let isMounted = true;
        const controller = new AbortController();

        async function loadAllData() {
            setLoading(true);
            setError(null);

            try {
                // Fetch essential data + optional data with individual catch
                const [rawIssuer, metricsData, historyData] = await Promise.all([
                    fetchIssuerDetail(issuerId!, controller.signal),
                    fetchIssuerMetrics(issuerId!, controller.signal).catch(err => {
                        console.warn('Failed to load metrics, continuing...', err);
                        return null;
                    }),
                    fetchIssuerHistory(issuerId!, controller.signal).catch(err => {
                        console.warn('Failed to load history, continuing...', err);
                        return [];
                    })
                ]);

                if (!isMounted) return;

                // Transform Issuer Profile (Mandatory)
                const transformedIssuer = transformIssuer(rawIssuer);
                setIssuer(transformedIssuer);

                // Handle Metrics (Optional)
                if (metricsData && metricsData.metrics) {
                    setMetrics(metricsData.metrics);
                }

                // Handle History (Optional)
                if (Array.isArray(historyData)) {
                    const sortedHistory = [...historyData].sort(
                        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
                    );
                    setHistory(sortedHistory);
                }

            } catch (err: any) {
                if (err.name === 'AbortError') return;

                console.error(`Failed to load mandatory data for issuer ${issuerId}:`, err);
                if (isMounted) {
                    setError(err.message || 'Error al cargar los datos básicos del emisor');
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        }

        loadAllData();

        return () => {
            isMounted = false;
            controller.abort();
        };
    }, [issuerId]);

    return { issuer, metrics, history, loading, error };
}
