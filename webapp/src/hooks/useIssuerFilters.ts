import { useState, useMemo } from 'react';
import type { Issuer } from '../types';

export function useIssuerFilters(issuers: Issuer[]) {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSector, setSelectedSector] = useState('Todos');
    const [sortBy, setSortBy] = useState<'docs' | 'name' | 'sector'>('docs');

    // Dynamic sector list based on real data
    const availableSectors = useMemo(() => {
        const sectors = new Set<string>(['Todos']);
        issuers.forEach(i => {
            if (i.sector) sectors.add(i.sector);
        });
        return Array.from(sectors).sort();
    }, [issuers]);

    const filteredIssuers = useMemo(() => {
        let result = [...issuers];

        // Filter by search term
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(i =>
                i.name.toLowerCase().includes(term) ||
                (i.acronym && i.acronym.toLowerCase().includes(term)) ||
                (i.sector && i.sector.toLowerCase().includes(term))
            );
        }

        // Filter by sector
        if (selectedSector !== 'Todos') {
            result = result.filter(i => i.sector === selectedSector);
        }

        // Sort
        switch (sortBy) {
            case 'docs':
                result.sort((a, b) => (b.documents?.length || 0) - (a.documents?.length || 0));
                break;
            case 'name':
                result.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'sector':
                result.sort((a, b) => (a.sector || '').localeCompare(b.sector || ''));
                break;
        }

        return result;
    }, [issuers, searchTerm, selectedSector, sortBy]);

    const sectorStats = useMemo(() => {
        const stats: Record<string, number> = {};
        issuers.forEach(i => {
            const sector = i.sector || 'General';
            stats[sector] = (stats[sector] || 0) + 1;
        });
        return stats;
    }, [issuers]);

    return {
        searchTerm,
        setSearchTerm,
        selectedSector,
        setSelectedSector,
        sortBy,
        setSortBy,
        availableSectors,
        filteredIssuers,
        sectorStats,
        clearFilters: () => {
            setSearchTerm('');
            setSelectedSector('Todos');
        }
    };
}
