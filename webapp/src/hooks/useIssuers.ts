import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchIssuers } from '../utils/marketDataApi';
import type { Issuer } from '../types';

interface UseIssuersOptions {
    timeout?: number;
    retries?: number;
    forceRefresh?: boolean;
}

// Simple in-memory cache singleton
let CACHE: Issuer[] | null = null;

/**
 * Resets the in-memory cache. 
 * Primarily used for testing purposes to ensure isolation between tests.
 */
export const resetIssuersCache = () => {
    CACHE = null;
};

export function useIssuers(options: UseIssuersOptions = {}) {
    const { retries = 0, forceRefresh = false } = options;
    const [issuers, setIssuers] = useState<Issuer[]>(CACHE || []);
    const [loading, setLoading] = useState(!CACHE || forceRefresh);
    const [error, setError] = useState<Error | null>(null);
    const [isRetrying, setIsRetrying] = useState(false);
    const retryCountRef = useRef(0);
    const abortControllerRef = useRef<AbortController | null>(null);

    const loadIssuers = useCallback(async (isRetry = false, force = false) => {
        // If not force and we have cache, don't fetch
        if (!force && CACHE && !isRetry) {
            setIssuers(CACHE);
            setLoading(false);
            return;
        }

        // Cancel previous request if any
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        const controller = new AbortController();
        abortControllerRef.current = controller;

        if (isRetry) {
            setIsRetrying(true);
        } else {
            setLoading(true);
        }
        setError(null);

        try {
            const data = await fetchIssuers(controller.signal);

            // Aligned with Phase 4: fetchIssuers already returns clean, consolidated data
            const cleanData = data.issuers || [];
            CACHE = cleanData;
            setIssuers(cleanData);
            retryCountRef.current = 0; // Reset on success
            setError(null);
        } catch (err: any) {
            if (err.name === 'AbortError') return;

            const errorObj = err instanceof Error ? err : new Error('Error de conexión');
            setError(errorObj);

            // Automatic retry logic
            if (retryCountRef.current < retries) {
                retryCountRef.current++;
                const delay = 1000 * Math.pow(2, retryCountRef.current); // Exponential backoff
                setTimeout(() => {
                    loadIssuers(true);
                }, delay);
                return;
            }
        } finally {
            if (!controller.signal.aborted) {
                setLoading(false);
                setIsRetrying(false);
            }
        }
    }, [retries]);

    useEffect(() => {
        loadIssuers(false, forceRefresh);
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [loadIssuers, forceRefresh]);

    const handleRetry = () => {
        retryCountRef.current = 0;
        loadIssuers(true);
    };

    return {
        issuers,
        loading,
        error,
        retry: handleRetry,
        refresh: () => loadIssuers(false, true),
        isRetrying
    };
}
