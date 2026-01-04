import { useState, useCallback, useRef, useEffect } from 'react';
import { apiClient } from '../utils/apiClient';

// --- Types ---

export interface SearchResult {
    answer: string;
    sources: Array<{
        issuer: string;
        documentTitle: string;
        relevance: number;
    }>;
    metadata: {
        chunksUsed: number;
        documentsFound: number;
        yearsFound: string;
    };
    queryUnderstanding?: {
        intent: string;
        issuers: string[];
        metrics: string[];
        timeframe?: string;
        enhancedQuery: string;
    };
}

export interface NewsItem {
    id: string;
    headline: string;
    summary: string;
    category: 'rating' | 'financials' | 'market' | 'announcement';
    issuers: string[];
    documentSource: string;
    timestamp: string;
    isAIGenerated: boolean;
}

export interface Insight {
    insight: string;
    sentiment: 'positive' | 'negative' | 'neutral';
    confidence: number;
    metrics: string[];
    citations?: Array<{
        text: string;
        source: string;
        relevance?: string;
    }>;
    generatedAt: string;
}

// --- Hook ---

export function useAIResearch() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    const createNewAbortController = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        const controller = new AbortController();
        abortControllerRef.current = controller;
        return controller;
    }, []);

    const search = useCallback(async (query: string): Promise<SearchResult | null> => {
        if (!query.trim()) return null;

        const controller = createNewAbortController();

        try {
            setLoading(true);
            setError(null);

            const data = await apiClient<any>('/ai/smart-search', {
                method: 'POST',
                body: JSON.stringify({ query: query.trim() }),
                signal: controller.signal
            });

            return {
                answer: data.results.answer,
                sources: data.results.sources,
                metadata: data.results.metadata,
                queryUnderstanding: data.queryUnderstanding,
            };
        } catch (err: any) {
            if (err.name === 'AbortError') {
                console.log('Search aborted');
                return null;
            }
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [createNewAbortController]);

    const getNews = useCallback(async (days: number): Promise<NewsItem[]> => {
        const controller = createNewAbortController();

        try {
            setLoading(true);
            setError(null);

            const data = await apiClient<any>(`/ai/news`, {
                params: { days },
                signal: controller.signal
            });
            return data.newsItems || [];
        } catch (err: any) {
            if (err.name === 'AbortError') {
                console.log('News fetch aborted');
                return [];
            }
            console.warn('AI News fetch failed:', err);
            setError(err.message || 'Error al cargar noticias');
            return [];
        } finally {
            setLoading(false);
        }
    }, [createNewAbortController]);

    const getInsight = useCallback(async (issuerId: string): Promise<Insight | null> => {
        const controller = createNewAbortController();

        try {
            setLoading(true);
            setError(null);

            const data = await apiClient<any>(`/ai/insights/${encodeURIComponent(issuerId)}`, {
                signal: controller.signal
            });

            if (data.success && data.insights) {
                return data.insights;
            } else {
                setError(data.message || 'No hay insights disponibles');
                return null;
            }
        } catch (err: any) {
            if (err.name === 'AbortError') return null;
            setError(err.message);
            return null;
        } finally {
            setLoading(false);
        }
    }, [createNewAbortController]);

    return {
        loading,
        error,
        search,
        getNews,
        getInsight,
        setError
    };
}
