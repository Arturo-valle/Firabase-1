import type { MetricsData, ComparisonData } from '../types';
import { metricsCache } from './metricsCache';

import { apiClient } from './apiClient';

// const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

/**
 * Normalize issuer ID for backend compatibility
 * IDs from Firestore should be used directly (already slugified)
 */
export function normalizeIssuerId(id: string): string {
    // Simply lowercase - don't transform the ID format
    // Firestore IDs are already in the correct format (e.g., 'fama', 'bdf')
    return id.toLowerCase().trim();
}

// Mock Data Generator Removed for Production
// const generateMockMetrics = (issuerId: string): MetricsData => { ... };

/**
 * Fetch cached metrics for an issuer
 */
export async function fetchIssuerMetrics(issuerId: string, signal?: AbortSignal): Promise<MetricsData | null> {
    const normalizedId = normalizeIssuerId(issuerId);

    // 1. Try Cache first
    const cached = metricsCache.getMetrics(normalizedId);
    if (cached) return cached;

    // 2. Fetch from API
    try {
        const data = await apiClient<any>(`/metrics/${normalizedId}`, { signal });
        if (data.success && data.metrics) {
            metricsCache.setMetrics(normalizedId, data.metrics);
            return data.metrics;
        }
        return null;
    } catch (error) {
        console.error(`Error fetching metrics for ${issuerId}:`, error);
        return null;
    }
}

/**
 * Extract metrics from documents for an issuer
 */
export async function extractIssuerMetrics(issuerId: string): Promise<MetricsData> {
    const normalizedId = normalizeIssuerId(issuerId);
    const data = await apiClient<any>(`/metrics/extract/${normalizedId}`, {
        method: 'POST'
    });

    if (data.success && data.metrics) {
        metricsCache.setMetrics(normalizedId, data.metrics);
    }

    return data.success ? data.metrics : data;
}

/**
 * Compare metrics across multiple issuers
 */
export async function compareIssuers(issuerIds: string[], signal?: AbortSignal): Promise<ComparisonData> {
    const normalizedIds = issuerIds.map(normalizeIssuerId);

    // 1. Try Cache first
    const cached = metricsCache.getComparison(normalizedIds);
    if (cached) return cached;

    // 2. Fetch comparison
    try {
        const data = await apiClient<any>('/metrics/compare', {
            method: 'POST',
            body: JSON.stringify({ issuerIds: normalizedIds }),
            signal
        });

        const result = {
            issuers: data.comparison || data.issuers || [],
            rankings: data.rankings || {},
        };

        metricsCache.setComparison(normalizedIds, result);
        return result;
    } catch (error) {
        console.error('Error comparing issuers:', error);
        return {
            issuers: [],
            rankings: {},
        };
    }
}

/**
 * Extract metrics for all active issuers (batch operation)
 */
export async function extractAllMetrics(): Promise<Record<string, unknown>> {
    return apiClient<any>('/metrics/extract-all', { method: 'POST' });
}

/**
 * Format number for display
 */
export function formatMetricValue(value: number | null, unit?: string): string {
    if (value === null || value === undefined) return 'N/D';

    if (unit === '%') {
        return `${value.toFixed(2)}%`;
    } else if (unit === 'M') {
        return `${value.toLocaleString('es-NI', { maximumFractionDigits: 1 })}M`;
    } else if (unit === 'x') {
        return `${value.toFixed(2)}x`;
    }

    return value.toLocaleString('es-NI', { maximumFractionDigits: 2 });
}

/**
 * Get color for metric value (for trends)
 */
export function getMetricColor(value: number | null, isPositiveBetter: boolean = true): string {
    if (value === null) return 'text-text-disabled';

    if (isPositiveBetter) {
        return value > 0 ? 'text-status-success' : 'text-status-danger';
    } else {
        return value > 0 ? 'text-status-danger' : 'text-status-success';
    }
}
