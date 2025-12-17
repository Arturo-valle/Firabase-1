import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
    MagnifyingGlassIcon,
    FunnelIcon,
    BuildingOfficeIcon,
    DocumentTextIcon,
    ChartBarIcon,
    ArrowTrendingUpIcon
} from '@heroicons/react/24/outline';
import { fetchIssuers } from '../utils/marketDataApi';
import type { Issuer } from '../types';

const SECTORS = ['Todos', 'Banca', 'Microfinanzas', 'Industria', 'Servicios Financieros', 'Fondos de Inversión'];

export default function Discover() {
    const [issuers, setIssuers] = useState<Issuer[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSector, setSelectedSector] = useState('Todos');
    const [sortBy, setSortBy] = useState<'docs' | 'name' | 'sector'>('docs');

    useEffect(() => {
        async function loadIssuers() {
            try {
                const data = await fetchIssuers();
                const issuersList = data.issuers?.map((issuer: any) => ({
                    id: issuer.id,
                    name: issuer.name,
                    sector: issuer.sector || 'General',
                    acronym: issuer.acronym || '',
                    documents: issuer.documents || [],
                    logoUrl: issuer.logoUrl || '',
                })) || [];
                setIssuers(issuersList);
            } catch (error) {
                console.error('Failed to load issuers:', error);
            } finally {
                setLoading(false);
            }
        }
        loadIssuers();
    }, []);

    const filteredIssuers = useMemo(() => {
        let result = [...issuers];

        // Filter by search term
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(i =>
                i.name.toLowerCase().includes(term) ||
                i.acronym?.toLowerCase().includes(term) ||
                i.sector?.toLowerCase().includes(term)
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

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="animate-spin w-12 h-12 border-4 border-accent-primary border-t-transparent rounded-full mx-auto mb-4" />
                    <p className="text-text-secondary">Cargando emisores...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div>
                <h2 className="text-3xl font-bold text-text-primary mb-2">
                    🧭 Descubrir Emisores
                </h2>
                <p className="text-text-secondary">
                    Explora y filtra los {issuers.length} emisores activos del mercado nicaragüense
                </p>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="card bg-accent-primary/10 border border-accent-primary/20 p-4">
                    <div className="flex items-center gap-3">
                        <BuildingOfficeIcon className="w-8 h-8 text-accent-primary" />
                        <div>
                            <p className="text-2xl font-bold text-text-primary">{issuers.length}</p>
                            <p className="text-xs text-text-tertiary">Emisores</p>
                        </div>
                    </div>
                </div>
                <div className="card bg-status-success/10 border border-status-success/20 p-4">
                    <div className="flex items-center gap-3">
                        <DocumentTextIcon className="w-8 h-8 text-status-success" />
                        <div>
                            <p className="text-2xl font-bold text-text-primary">
                                {issuers.reduce((acc, i) => acc + (i.documents?.length || 0), 0)}
                            </p>
                            <p className="text-xs text-text-tertiary">Documentos</p>
                        </div>
                    </div>
                </div>
                <div className="card bg-accent-secondary/10 border border-accent-secondary/20 p-4">
                    <div className="flex items-center gap-3">
                        <ChartBarIcon className="w-8 h-8 text-accent-secondary" />
                        <div>
                            <p className="text-2xl font-bold text-text-primary">{Object.keys(sectorStats).length}</p>
                            <p className="text-xs text-text-tertiary">Sectores</p>
                        </div>
                    </div>
                </div>
                <div className="card bg-accent-tertiary/10 border border-accent-tertiary/20 p-4">
                    <div className="flex items-center gap-3">
                        <ArrowTrendingUpIcon className="w-8 h-8 text-accent-tertiary" />
                        <div>
                            <p className="text-2xl font-bold text-text-primary">
                                {issuers.filter(i => (i.documents?.length || 0) > 0).length}
                            </p>
                            <p className="text-xs text-text-tertiary">Con Datos</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="card">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1 relative">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre, acrónimo o sector..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-bg-tertiary border border-border-default rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent-primary transition-colors"
                        />
                    </div>

                    {/* Sector Filter */}
                    <div className="flex items-center gap-2">
                        <FunnelIcon className="w-5 h-5 text-text-tertiary" />
                        <select
                            value={selectedSector}
                            onChange={(e) => setSelectedSector(e.target.value)}
                            className="bg-bg-tertiary border border-border-default rounded-lg px-4 py-3 text-text-primary focus:outline-none focus:border-accent-primary"
                        >
                            {SECTORS.map(sector => (
                                <option key={sector} value={sector}>
                                    {sector} {sector !== 'Todos' && sectorStats[sector] ? `(${sectorStats[sector]})` : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Sort */}
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="bg-bg-tertiary border border-border-default rounded-lg px-4 py-3 text-text-primary focus:outline-none focus:border-accent-primary"
                    >
                        <option value="docs">Más Documentos</option>
                        <option value="name">Alfabético</option>
                        <option value="sector">Por Sector</option>
                    </select>
                </div>
            </div>

            {/* Results Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredIssuers.length > 0 ? (
                    filteredIssuers.map((issuer) => (
                        <Link
                            key={issuer.id}
                            to={`/issuer/${encodeURIComponent(issuer.id)}`}
                            className="group card hover:border-accent-primary/50 hover:shadow-glow-cyan transition-all duration-300"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-gradient-to-br from-accent-primary/20 to-accent-secondary/20 rounded-lg flex items-center justify-center">
                                        <BuildingOfficeIcon className="w-6 h-6 text-accent-primary" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-text-primary group-hover:text-accent-primary transition-colors line-clamp-1">
                                            {issuer.name}
                                        </h3>
                                        <span className="text-xs text-text-tertiary">{issuer.sector}</span>
                                    </div>
                                </div>
                                {issuer.acronym && (
                                    <span className="text-xs font-mono font-bold text-accent-primary bg-accent-primary/10 px-2 py-1 rounded">
                                        {issuer.acronym}
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-border-subtle">
                                <div className="flex items-center gap-2">
                                    <DocumentTextIcon className="w-4 h-4 text-text-tertiary" />
                                    <span className="text-sm text-text-secondary">
                                        {issuer.documents?.length || 0} documentos
                                    </span>
                                </div>
                                <span className="text-xs text-accent-secondary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                    Ver Detalles →
                                </span>
                            </div>
                        </Link>
                    ))
                ) : (
                    <div className="col-span-full text-center py-12">
                        <MagnifyingGlassIcon className="w-16 h-16 text-text-tertiary mx-auto mb-4" />
                        <p className="text-text-secondary">No se encontraron emisores con los filtros aplicados</p>
                        <button
                            onClick={() => { setSearchTerm(''); setSelectedSector('Todos'); }}
                            className="mt-4 text-accent-primary hover:underline"
                        >
                            Limpiar filtros
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
