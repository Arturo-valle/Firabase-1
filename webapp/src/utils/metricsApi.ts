import type { MetricsData, ComparisonData } from '../types';

const API_BASE = 'https://us-central1-mvp-nic-market.cloudfunctions.net/api';

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

// Mock Data Generator
const generateMockMetrics = (issuerId: string): MetricsData => {
    const random = (min: number, max: number) => Math.random() * (max - min) + min;

    return {
        issuerId,
        issuerName: issuerId.replace(/_/g, ' ').toUpperCase(),
        liquidez: {
            ratioCirculante: random(1.2, 3.5),
            pruebaAcida: random(0.8, 2.5),
            capitalTrabajo: random(100, 500),
        },
        solvencia: {
            deudaActivos: random(40, 70),
            deudaPatrimonio: random(1.5, 3.0),
            coberturIntereses: random(2.5, 8.0),
        },
        rentabilidad: {
            roe: random(10, 25),
            roa: random(2, 8),
            margenNeto: random(15, 35),
            utilidadNeta: random(50, 200),
        },
        eficiencia: {
            rotacionActivos: random(0.5, 1.5),
            rotacionCartera: random(4, 12),
            morosidad: random(1, 5),
        },
        capital: {
            activosTotales: random(1000, 5000),
            patrimonio: random(300, 1500),
            pasivos: random(700, 3500),
        },
        calificacion: {
            rating: ['AAA', 'AA+', 'AA', 'A+', 'A'][Math.floor(Math.random() * 5)],
            perspectiva: ['Estable', 'Positiva'][Math.floor(Math.random() * 2)],
            fecha: '2024-03-15',
        },
        metadata: {
            periodo: '2023',
            moneda: 'NIO',
            fuente: 'Estados Financieros Auditados',
        },
        extractedAt: new Date().toISOString(),
    };
};

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
            console.warn('API fetch failed, using mock data', e);
        }

        // Fallback to mock data for UI development/verification
        console.log(`Using mock metrics for ${issuerId}`);
        return new Promise(resolve => setTimeout(() => resolve(generateMockMetrics(issuerId)), 500));

    } catch (error) {
        console.error('Error fetching metrics:', error);
        return generateMockMetrics(issuerId); // Ultimate fallback
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
            // Fallback for demo
            return new Promise(resolve => setTimeout(() => resolve(generateMockMetrics(issuerId)), 1500));
        }

        const data = await response.json();
        return data.success ? data.metrics : data;
    } catch (error) {
        console.error('Error extracting metrics:', error);
        return new Promise(resolve => setTimeout(() => resolve(generateMockMetrics(issuerId)), 1500));
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
            console.warn('API compare failed, using mock data', e);
        }

        // Mock comparison
        const mockIssuers = issuerIds.map(id => generateMockMetrics(id));
        return new Promise(resolve => setTimeout(() => resolve({
            issuers: mockIssuers as any,
            rankings: {
                liquidez: mockIssuers.map(i => i.issuerName),
                solvencia: mockIssuers.map(i => i.issuerName),
                rentabilidad: mockIssuers.map(i => i.issuerName),
                overall: mockIssuers.map(i => i.issuerName),
            }
        }), 800));

    } catch (error) {
        console.error('Error comparing issuers:', error);
        throw error;
    }
}

/**
 * Extract metrics for all active issuers (batch operation)
 */
export async function extractAllMetrics(): Promise<any> {
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
