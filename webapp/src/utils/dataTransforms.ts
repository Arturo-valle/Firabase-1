import type { Issuer } from '../types';
import { DISPLAY_NAMES, ISSUER_METADATA } from './marketDataApi';

/**
 * Transforms raw issuer data from API into standardized Issuer objects.
 * Applies display names, metadata (acronym/sector), and filters empty issuers.
 */
export function transformIssuers(rawIssuers: any[]): Issuer[] {
    if (!rawIssuers) return [];

    return rawIssuers.map((issuer: any) => ({
        id: issuer.id,
        name: DISPLAY_NAMES[issuer.id] || issuer.name,
        sector: ISSUER_METADATA[issuer.id]?.sector || issuer.sector || 'Privado',
        acronym: ISSUER_METADATA[issuer.id]?.acronym || issuer.acronym || '',
        documents: issuer.documents || [],
        logoUrl: issuer.logoUrl || '',
        processed: issuer.documents?.length || 0,
        total: issuer.documents?.length || 0
    }))
        .filter((issuer: any) => issuer.documents?.length > 0);
}
