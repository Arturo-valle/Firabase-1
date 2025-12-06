// API utility functions for fetching market data

const API_BASE_URL = 'https://us-central1-mvp-nic-market.cloudfunctions.net/api';

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
    documents: any[];
    isActive: boolean;
    sector?: string;
    rating?: string;
}

/**
 * Fetch system status including all processed issuers
 */
export async function fetchSystemStatus(): Promise<SystemStatus> {
    const response = await fetch(`${API_BASE_URL}/status`);
    if (!response.ok) {
        throw new Error('Failed to fetch system status');
    }
    return response.json();
}

/**
 * Fetch details for a specific issuer
 */
export async function fetchIssuerDetail(issuerId: string): Promise<IssuerDetail> {
    const response = await fetch(`${API_BASE_URL}/issuer/${encodeURIComponent(issuerId)}`);
    if (!response.ok) {
        throw new Error(`Failed to fetch issuer: ${issuerId}`);
    }
    return response.json();
}

/**
 * Fetch AI-generated news
 */
export async function fetchAINews(days: number = 7) {
    const response = await fetch(`${API_BASE_URL}/ai/news?days=${days}`);
    if (!response.ok) {
        throw new Error('Failed to fetch AI news');
    }
    return response.json();
}

/**
 * Fetch metrics comparison for multiple issuers
 */
export async function fetchMetricsComparison(issuerIds: string[]) {
    const response = await fetch(`${API_BASE_URL}/metrics/compare`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ issuerIds }),
    });
    if (!response.ok) {
        throw new Error('Failed to fetch metrics comparison');
    }
    return response.json();
}

/**
 * Fetch historical data for a specific issuer
 */
export async function fetchIssuerHistory(issuerId: string) {
    const response = await fetch(`${API_BASE_URL}/metrics/history/${encodeURIComponent(issuerId)}`);
    if (!response.ok) {
        throw new Error('Failed to fetch issuer history');
    }
    return response.json();
}

// Mock data generators removed to ensure data authenticity. 
// Real data will be implemented when historical time-series data becomes available.

/**
 * Calculate market summary statistics
 */
export function calculateMarketStats(issuers: Array<{ processed: number; total: number }>) {
    const totalProcessed = issuers.reduce((sum, i) => sum + i.processed, 0);
    const totalAvailable = issuers.reduce((sum, i) => sum + i.total, 0);
    const coverage = totalAvailable > 0 ? (totalProcessed / totalAvailable) * 100 : 0;

    return {
        totalProcessed,
        totalAvailable,
        coverage: `${coverage.toFixed(1)}%`,
        avgDocsPerIssuer: Math.round(totalProcessed / issuers.length),
    };
}

/**
 * Fetch all issuers (active and inactive)
 */
/**
 * Fetch all issuers (active and inactive)
 */
/**
 * Fetch all issuers (active and inactive)
 */
export const DISPLAY_NAMES: { [key: string]: string } = {
    "agricorp": "Agricorp",
    "banpro": "Banpro",
    "bdf": "BDF",
    "fama": "Financiera FAMA",
    "fdl": "Financiera FDL",
    "fid": "FID",
    "horizonte": "Fondo de Inversión Horizonte"
};

export const ISSUER_METADATA: { [key: string]: { acronym: string, sector: string } } = {
    "agricorp": { acronym: "AGRI", sector: "Industria" },
    "banpro": { acronym: "BANPRO", sector: "Banca" },
    "bdf": { acronym: "BDF", sector: "Banca" },
    "fama": { acronym: "FAMA", sector: "Microfinanzas" },
    "fdl": { acronym: "FDL", sector: "Microfinanzas" },
    "fid": { acronym: "FID", sector: "Servicios Financieros" },
    "horizonte": { acronym: "HORIZONTE", sector: "Fondos de Inversión" }
};

/**
 * Fetch all issuers (active and inactive)
 */
export async function fetchIssuers(): Promise<{ issuers: any[] }> {
    // Add cache busting to force fresh data
    const response = await fetch(`${API_BASE_URL}/issuers?t=${Date.now()}`);
    if (!response.ok) {
        throw new Error('Failed to fetch issuers');
    }
    const data = await response.json();

    // Filter to ensure they have documents (active) AND recent activity (>= 2023)
    const RECENCY_CUTOFF_DATE = new Date('2023-01-01');

    // STRICT WHITELIST (7 Official Issuers)
    const WHITELIST = [
        "agricorp",
        "banpro",
        "bdf",
        "fama",
        "fdl",
        "fid",
        "horizonte"
    ];

    const parseDocumentDate = (dateStr: string): Date | null => {
        if (!dateStr) return null;
        try {
            // Normalize separators: replace - with /
            const normalized = dateStr.replace(/-/g, '/');
            // Remove time part if present (e.g. "28/07/2020 04:25:00 pm")
            const datePart = normalized.split(' ')[0];

            const parts = datePart.split('/');
            if (parts.length === 3) {
                // Assume DD/MM/YYYY
                const [day, month, year] = parts;
                const d = new Date(`${year}-${month}-${day}`);
                if (!isNaN(d.getTime())) return d;
            }

            // Fallback for ISO or other formats
            const date = new Date(dateStr);
            return isNaN(date.getTime()) ? null : date;
        } catch (e) {
            return null;
        }
    };

    if (data.issuers) {
        console.log(`[MarketData] Raw issuers count: ${data.issuers.length}`);

        // --- Secondary Deduplication & Whitelist Layer (Frontend Safety Net) ---
        const consolidatedMap = new Map<string, any>();

        const getFrontendBaseName = (name: string) => {
            let normalized = name.toLowerCase()
                .normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

            // Handle separators
            const separators = [' - ', ' – ', ' — ', '(', ','];
            for (const sep of separators) {
                if (normalized.includes(sep)) {
                    normalized = normalized.split(sep)[0].trim();
                }
            }

            // Alias Map (Frontend version)
            const aliases: { [key: string]: string } = {
                // Agricorp
                "agri": "agricorp",
                "agricorp": "agricorp",
                "corporacion agricola": "agricorp",

                // Banpro
                "banpro": "banpro",
                "banco de la produccion": "banpro",
                "banco de la producción": "banpro",

                // BDF
                "bdf": "bdf",
                "bancodefinanzas": "bdf",
                "banco de finanzas": "bdf",

                // FAMA
                "fama": "fama",
                "financiera fama": "fama",

                // FDL
                "fdl": "fdl",
                "financiera fdl": "fdl",

                // FID
                "fid": "fid",
                "fid sociedad anonima": "fid",

                // Horizonte
                "horizonte": "horizonte",
                "horizonte fondo de inversion": "horizonte",
                "fondo inversion horizonte": "horizonte",
                "fondo inversión horizonte": "horizonte"
            };

            return aliases[normalized] || normalized;
        };

        data.issuers.forEach((issuer: any) => {
            const baseId = getFrontendBaseName(issuer.name);

            // STRICT WHITELIST CHECK
            if (!WHITELIST.includes(baseId)) {
                // console.log(`[MarketData] Skipping non-whitelisted: ${baseId}`);
                return;
            }

            if (!consolidatedMap.has(baseId)) {
                const metadata = ISSUER_METADATA[baseId] || {};
                consolidatedMap.set(baseId, {
                    ...issuer,
                    id: baseId,
                    name: DISPLAY_NAMES[baseId] || issuer.name, // Enforce clean display name
                    acronym: metadata.acronym || issuer.acronym,
                    sector: metadata.sector || issuer.sector,
                    isActive: true // Explicitly mark whitelisted issuers as active
                });
            } else {
                // Merge
                const existing = consolidatedMap.get(baseId);
                // Merge docs
                const existingDocs = new Set(existing.documents.map((d: any) => d.url));
                if (issuer.documents) {
                    issuer.documents.forEach((doc: any) => {
                        if (!existingDocs.has(doc.url)) {
                            existing.documents.push(doc);
                            existingDocs.add(doc.url);
                        }
                    });
                }
            }
        });

        const consolidatedIssuers = Array.from(consolidatedMap.values());
        console.log(`[MarketData] Consolidated count: ${consolidatedIssuers.length}`);

        data.issuers = consolidatedIssuers
            .filter((issuer: any) => {
                const hasDocs = issuer.documents && issuer.documents.length > 0;
                if (!hasDocs) return false;

                // STRICT WHITELIST BYPASS: Always show whitelisted issuers regardless of date
                const baseId = getFrontendBaseName(issuer.name);
                if (WHITELIST.includes(baseId)) {
                    return true;
                }

                // Check for recency for non-whitelisted (though whitelist is strict now)
                const hasRecentDocs = issuer.documents.some((doc: any) => {
                    const docDate = parseDocumentDate(doc.date);
                    return docDate && docDate >= RECENCY_CUTOFF_DATE;
                });

                if (!hasRecentDocs) {
                    const lastDoc = issuer.documents[0]?.date;
                    console.log(`[MarketData] Rejected Old: ${issuer.name} (Last: ${lastDoc})`);
                    return false;
                }

                return true;
            })
            // Sort by document count
            .sort((a: any, b: any) => b.documents.length - a.documents.length);

        console.log(`[MarketData] Final active issuers: ${data.issuers.length}`);
    }

    return data;
}
