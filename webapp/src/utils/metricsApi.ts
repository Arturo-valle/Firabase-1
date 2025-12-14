import type { MetricsData, ComparisonData } from '../types';

const API_BASE = 'https://api-os3qsxfz6q-uc.a.run.app';

/**
 * Normalize issuer ID for backend compatibility
 * Frontend uses underscores, backend expects spaces without diacritics
 */
export function normalizeIssuerId(id: string): string {
    return id
        .replace(/_/g, ' ')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

// Mock Data Generator Removed for Production
// const generateMockMetrics = (issuerId: string): MetricsData => { ... };

/**
 * Fetch cached metrics for an issuer
 */
export async function fetchIssuerMetrics(issuerId: string): Promise<MetricsData | null> {
    try {
        const normalizedId = normalizeIssuerId(issuerId);
        // Try to fetch from API first
        try {
            const response = await fetch(`${API_BASE}/metrics/${normalizedId}`);
            if (response.ok) {
                const data = await response.json();
                if (data.success) return data.metrics;
            }
        } catch (e) {
            console.error('API fetch failed:', e);
        }

        return null;
    } catch (error) {
        console.error('Error fetching metrics:', error);
        return null;
    }
}

/**
 * Extract metrics from documents for an issuer
 */
export async function extractIssuerMetrics(issuerId: string): Promise<MetricsData> {
    try {
        const normalizedId = normalizeIssuerId(issuerId);
        const response = await fetch(`${API_BASE}/metrics/extract/${normalizedId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.success ? data.metrics : data;
    } catch (error) {
        console.error('Error extracting metrics:', error);
        throw error;
    }
}

/**
 * Compare metrics across multiple issuers
 */
export async function compareIssuers(issuerIds: string[]): Promise<ComparisonData> {
    try {
        const normalizedIds = issuerIds.map(normalizeIssuerId);

        try {
            const response = await fetch(`${API_BASE}/metrics/compare`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ issuerIds: normalizedIds }),
            });

            if (response.ok) {
                const data = await response.json();
                return {
                    issuers: data.comparison || data.issuers || [],
                    rankings: data.rankings,
                };
            }
        } catch (e) {
            console.error('API compare failed:', e);
            throw e;
        }

        return {
            issuers: [],
            rankings: {
                liquidez: [],
                solvencia: [],
                rentabilidad: [],
                overall: []
            }
        };

    } catch (error) {
        console.error('Error comparing issuers:', error);
        throw error;
    }
}

/**
 * Extract metrics for all active issuers (batch operation)
 */
export async function extractAllMetrics(): Promise<Record<string, unknown>> {
    try {
        const response = await fetch(`${API_BASE}/metrics/extract-all`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error extracting all metrics:', error);
        throw error;
    }
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
