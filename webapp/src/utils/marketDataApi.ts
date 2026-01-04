import type { Issuer, Document } from '../types';
import { DISPLAY_NAMES, ISSUER_METADATA } from './issuerTransformers';
import { apiClient } from './apiClient';

export { DISPLAY_NAMES, ISSUER_METADATA };

export interface SystemStatus {
    systemHealth: string;
    stats: {
        totalIssuers: number;
        processedIssuers: number;
        coverage: string;
        totalDocumentsAvailable: number;
        totalDocumentsProcessed: number;
        totalChunksGenerated: number;
    };
    processedIssuers: Array<{
        id: string;
        name: string;
        processed: number;
        total: number;
        lastProcessed: string;
    }>;
}

export interface IssuerDetail {
    id: string;
    name: string;
    documents: Document[];
    isActive: boolean;
    sector?: string;
    rating?: string;
}

/**
 * Fetch system status including all processed issuers
 */
export async function fetchSystemStatus(signal?: AbortSignal): Promise<SystemStatus> {
    return apiClient<SystemStatus>('/status', { signal });
}

/**
 * Fetch details for a specific issuer
 */
export async function fetchIssuerDetail(issuerId: string, signal?: AbortSignal): Promise<IssuerDetail> {
    return apiClient<IssuerDetail>(`/issuer/${encodeURIComponent(issuerId)}`, { signal });
}

/**
 * Fetch metrics for a specific issuer
 */
export async function fetchIssuerMetrics(issuerId: string, signal?: AbortSignal) {
    return apiClient<any>(`/metrics/${encodeURIComponent(issuerId)}`, { signal });
}

/**
 * Fetch AI-generated news
 */
export async function fetchAINews(days: number = 7, signal?: AbortSignal) {
    return apiClient<any>(`/ai/news`, { params: { days }, signal });
}

/**
 * Fetch metrics comparison for multiple issuers
 */
export async function fetchMetricsComparison(issuerIds: string[], signal?: AbortSignal) {
    return apiClient<{ success: boolean; comparison: any[] }>('/metrics/compare', {
        method: 'POST',
        body: JSON.stringify({ issuerIds }),
        signal
    });
}

/**
 * Fetch historical data for a specific issuer
 */
export async function fetchIssuerHistory(issuerId: string, signal?: AbortSignal) {
    return apiClient<any>(`/metrics/history/${encodeURIComponent(issuerId)}`, { signal });
}

// Mock data generators removed to ensure data authenticity. 
// Real data will be implemented when historical time-series data becomes available.

/**
 * Calculate market summary statistics
 */
export function calculateMarketStats(issuers: Array<{ processed: number; total: number }>) {
    const totalProcessedDocs = issuers.reduce((sum, i) => sum + i.processed, 0);
    const totalAvailableDocs = issuers.reduce((sum, i) => sum + i.total, 0);
    const overallCoverage = totalAvailableDocs > 0 ? (totalProcessedDocs / totalAvailableDocs) * 100 : 0;

    // Estimation of chunks (15 chunks per document as per architecture)
    const totalChunks = totalProcessedDocs * 15;

    return {
        totalIssuers: issuers.length,
        totalProcessedDocs,
        totalAvailableDocs,
        totalChunks,
        overallCoverage
    };
}

import { consolidateIssuers } from './issuerTransformers';

/**
 * Fetch all issuers (pre-filtered and whitelisted by backend)
 */
export async function fetchIssuers(signal?: AbortSignal): Promise<{ issuers: Issuer[] }> {
    const data = await apiClient<{ issuers: any[] }>('/issuers', { signal });
    return {
        issuers: consolidateIssuers(data.issuers || [])
    };
}
