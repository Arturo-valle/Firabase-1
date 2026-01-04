import { useState, useCallback, useRef, useEffect } from 'react';
import type { MetricsData } from '../types';
import { fetchIssuerMetrics, extractIssuerMetrics } from '../utils/metricsApi';

/**
 * Hook to manage fetching and manual extraction of issuer metrics.
 */
export function useIssuerMetrics() {
    const [metrics, setMetrics] = useState<MetricsData | null>(null);
    const [loading, setLoading] = useState(false);
    const [extracting, setExtracting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const abortControllerRef = useRef<AbortController | null>(null);

    // Clean up on unmount
    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    const loadMetrics = useCallback(async (issuerId: string) => {
        if (!issuerId) {
            setMetrics(null);
            return;
        }

        // Cancel previous request if any
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        const controller = new AbortController();
        abortControllerRef.current = controller;

        setLoading(true);
        setError(null);

        try {
            const data = await fetchIssuerMetrics(issuerId, controller.signal);
            setMetrics(data);
        } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') return;
            console.error('Error loading metrics:', err);
            setError(err instanceof Error ? err.message : 'Error al cargar métricas');
            setMetrics(null);
        } finally {
            if (abortControllerRef.current === controller) {
                setLoading(false);
                abortControllerRef.current = null;
            }
        }
    }, []);

    const extractMetrics = useCallback(async (issuerId: string) => {
        if (!issuerId) return;

        setExtracting(true);
        setError(null);

        try {
            const data = await extractIssuerMetrics(issuerId);
            setMetrics(data);
            return data;
        } catch (err) {
            console.error('Error extracting metrics:', err);
            const msg = err instanceof Error ? err.message : 'Error al extraer métricas';
            setError(msg);
            throw new Error(msg);
        } finally {
            setExtracting(false);
        }
    }, []);

    const resetMetrics = useCallback(() => {
        setMetrics(null);
        setError(null);
    }, []);

    return {
        metrics,
        loading,
        extracting,
        error,
        loadMetrics,
        extractMetrics,
        resetMetrics
    };
}
