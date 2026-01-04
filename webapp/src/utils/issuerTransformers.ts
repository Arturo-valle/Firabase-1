import type { Issuer, Document } from '../types';

export const WHITELIST = [
    "agricorp",
    "banpro",
    "bdf",
    "fama",
    "fdl",
    "fid",
    "horizonte"
];

export const DISPLAY_NAMES: Record<string, string> = {
    "agricorp": "Agricorp",
    "banpro": "Banpro",
    "bdf": "BDF",
    "fama": "Financiera FAMA",
    "fdl": "Financiera FDL",
    "fid": "FID",
    "horizonte": "Fondo de Inversión Horizonte"
};

export const ISSUER_METADATA: Record<string, { acronym: string; sector: string }> = {
    "agricorp": { acronym: "AGRI", sector: "Industria" },
    "banpro": { acronym: "BANPRO", sector: "Banca" },
    "bdf": { acronym: "BDF", sector: "Banca" },
    "fama": { acronym: "FAMA", sector: "Microfinanzas" },
    "fdl": { acronym: "FDL", sector: "Microfinanzas" },
    "fid": { acronym: "FID", sector: "Servicios Financieros" },
    "horizonte": { acronym: "HORIZONTE", sector: "Fondos de Inversión" }
};


/**
 * Normalizes an issuer name to its base ID.
 */
export const getFrontendBaseName = (name: string): string => {
    let normalized = name.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();

    const separators = [' - ', ' – ', ' — ', '(', ','];
    for (const sep of separators) {
        if (normalized.includes(sep)) {
            normalized = normalized.split(sep)[0].trim();
        }
    }

    const aliases: Record<string, string> = {
        "agri": "agricorp",
        "corporacion agricola": "agricorp",
        "banco de la produccion": "banpro",
        "banco de la producción": "banpro",
        "bancodefinanzas": "bdf",
        "banco de finanzas": "bdf",
        "financiera fama": "fama",
        "financiera fdl": "fdl",
        "fid sociedad anonima": "fid",
        "fid-s-a": "fid",
        "fid s.a": "fid",
        "fid, s.a": "fid",
        "horizonte fondo de inversion": "horizonte",
        "horizonte-fondo-de-inversion": "horizonte",
        "fondo inversion horizonte": "horizonte",
        "fondo inversión horizonte": "horizonte",
        "horizonte fondo de inversion financiero de crecimiento dolares no diversificado": "horizonte"
    };

    return aliases[normalized] || normalized;
};

/**
 * Parses a document date string into a Date object.
 */
export const parseDocumentDate = (dateStr: string): Date | null => {
    if (!dateStr) return null;
    try {
        const normalized = dateStr.replace(/-/g, '/');
        const datePart = normalized.split(' ')[0];
        const parts = datePart.split('/');

        if (parts.length === 3) {
            const [day, month, year] = parts;
            const d = new Date(`${year}-${month}-${day}`);
            if (!isNaN(d.getTime())) return d;
        }

        const date = new Date(dateStr);
        return isNaN(date.getTime()) ? null : date;
    } catch (e) {
        return null;
    }
};

/**
 * Clean and transform a single document.
 */
export const transformDocument = (doc: any): Document => ({
    title: doc.title || 'Documento sin título',
    url: doc.url || '#',
    date: doc.date || '',
    type: doc.type || 'UNKNOWN'
});

/**
 * Consolidates and filters raw issuer data from the API.
 */
export const consolidateIssuers = (rawIssuers: any[]): Issuer[] => {
    const consolidatedMap = new Map<string, Issuer>();

    rawIssuers.forEach((issuer: any) => {
        const baseId = getFrontendBaseName(issuer.name);

        if (!WHITELIST.includes(baseId)) return;

        if (!consolidatedMap.has(baseId)) {
            const metadata = ISSUER_METADATA[baseId];
            consolidatedMap.set(baseId, {
                id: baseId,
                name: DISPLAY_NAMES[baseId] || issuer.name,
                acronym: metadata?.acronym || issuer.acronym || '',
                sector: metadata?.sector || issuer.sector || 'Privado',
                logoUrl: issuer.logoUrl || '',
                isActive: true,
                documents: (issuer.documents || []).map(transformDocument)
            });
        } else {
            const existing = consolidatedMap.get(baseId)!;
            const existingUrls = new Set(existing.documents.map(d => d.url));

            if (issuer.documents) {
                issuer.documents.forEach((doc: any) => {
                    if (!existingUrls.has(doc.url)) {
                        existing.documents.push(transformDocument(doc));
                        existingUrls.add(doc.url);
                    }
                });
            }
        }
    });

    return Array.from(consolidatedMap.values())
        .filter(issuer => {
            if (issuer.documents.length > 0) return true;

            // Allow whitelisted issuers even with no documents
            if (WHITELIST.includes(issuer.id)) return true;

            return false;
        })
        .sort((a, b) => b.documents.length - a.documents.length);
};

/**
 * Specifically for the Standardizer/List view: 
 * Ensures a clean list of issuers with all necessary display metadata.
 */
export const sanitizeIssuersList = (rawIssuers: any[]): Issuer[] => {
    if (!rawIssuers || !Array.isArray(rawIssuers)) return [];

    return rawIssuers.map((issuer: any) => {
        const id = issuer.id || getFrontendBaseName(issuer.name || '');
        const metadata = ISSUER_METADATA[id];

        return {
            id,
            name: DISPLAY_NAMES[id] || issuer.name || 'Emisor Desconocido',
            sector: metadata?.sector || issuer.sector || 'Privado',
            acronym: metadata?.acronym || issuer.acronym || '',
            documents: issuer.documents || [],
            logoUrl: issuer.logoUrl || '',
            isActive: issuer.isActive ?? true
        };
    });
};

/**
 * Transforms a single raw issuer data object from API into a standardized Issuer object.
 */
export const transformIssuer = (issuer: any): Issuer => {
    if (!issuer) throw new Error('No issuer data provided');
    const id = issuer.id || getFrontendBaseName(issuer.name || '');
    const metadata = ISSUER_METADATA[id];

    return {
        id,
        name: DISPLAY_NAMES[id] || issuer.name || 'Sin Nombre',
        sector: metadata?.sector || issuer.sector || 'Privado',
        acronym: metadata?.acronym || issuer.acronym || '',
        documents: (issuer.documents || []).map(transformDocument),
        logoUrl: issuer.logoUrl || '',
        isActive: issuer.isActive ?? true,
    };
};
