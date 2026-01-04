import type { MetricsData, ComparisonData } from '../types';

interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

class MetricsCache {
    private metricsCache = new Map<string, CacheEntry<MetricsData>>();
    private comparisonCache = new Map<string, CacheEntry<ComparisonData>>();

    setMetrics(issuerId: string, data: MetricsData) {
        this.metricsCache.set(issuerId.toLowerCase(), {
            data,
            timestamp: Date.now()
        });
    }

    getMetrics(issuerId: string): MetricsData | null {
        const entry = this.metricsCache.get(issuerId.toLowerCase());
        if (!entry) return null;

        if (Date.now() - entry.timestamp > CACHE_TTL) {
            this.metricsCache.delete(issuerId.toLowerCase());
            return null;
        }

        return entry.data;
    }

    setComparison(issuerIds: string[], data: ComparisonData) {
        const key = [...issuerIds].sort().join(',');
        this.comparisonCache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    getComparison(issuerIds: string[]): ComparisonData | null {
        const key = [...issuerIds].sort().join(',');
        const entry = this.comparisonCache.get(key);
        if (!entry) return null;

        if (Date.now() - entry.timestamp > CACHE_TTL) {
            this.comparisonCache.delete(key);
            return null;
        }

        return entry.data;
    }

    clear() {
        this.metricsCache.clear();
        this.comparisonCache.clear();
    }
}

export const metricsCache = new MetricsCache();
