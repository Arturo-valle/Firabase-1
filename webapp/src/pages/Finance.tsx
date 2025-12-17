import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BuildingOfficeIcon, ChartBarIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { fetchIssuers } from '../utils/marketDataApi';
import type { Issuer } from '../types';

export default function Finance() {
    const [issuers, setIssuers] = useState<Issuer[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            try {
                const data = await fetchIssuers();
                const issuersList = data.issuers?.map((issuer: any) => ({
                    id: issuer.id,
                    name: issuer.name,
                    sector: issuer.sector || 'Privado',
                    acronym: issuer.acronym || '',
                    documents: issuer.documents || [],
                    logoUrl: issuer.logoUrl || '',
                    processed: issuer.documents?.length || 0,
                    total: issuer.documents?.length || 0,
                    lastProcessed: new Date() // Mock date as Date object
                }))
                    .filter((issuer: any) => issuer.documents?.length > 0) || [];
                setIssuers(issuersList);
            } catch (error) {
                console.error('Failed to fetch system status:', error);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

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
                    💹 Emisores Procesados
                </h2>
                <p className="text-text-secondary">
                    Análisis financiero detallado de {issuers.length} emisores activos
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="card bg-accent-primary/10 border border-accent-primary/20">
                    <span className="text-accent-primary text-sm font-medium">Emisores Activos</span>
                    <p className="text-3xl font-bold text-text-primary mt-2">
                        {issuers.length}
                    </p>
                </div>
                <div className="card bg-status-success/10 border border-status-success/20">
                    <span className="text-status-success text-sm font-medium">Docs Procesados</span>
                    <p className="text-3xl font-bold text-text-primary mt-2">
                        {issuers.reduce((acc, i: any) => acc + (i.documents?.length || 0), 0)}
                    </p>
                </div>
                <div className="card bg-accent-secondary/10 border border-accent-secondary/20">
                    <span className="text-accent-secondary text-sm font-medium">Chunks en DB</span>
                    <p className="text-3xl font-bold text-text-primary mt-2">
                        {issuers.length > 0
                            ? `${(issuers.reduce((acc, i: any) => acc + (i.documents?.length || 0), 0) * 15 / 1000).toFixed(1)}K`
                            : '0'
                        }
                    </p>
                </div>
                <div className="card bg-accent-tertiary/10 border border-accent-tertiary/20">
                    <span className="text-accent-tertiary text-sm font-medium">Cobertura</span>
                    <p className="text-3xl font-bold text-text-primary mt-2">
                        {issuers.length > 0 ? `${Math.round(issuers.filter((i: any) => i.documents?.length > 0).length / issuers.length * 100)}%` : '0%'}
                    </p>
                </div>
            </div>

            {/* Issuers List */}
            <div className="card">
                <h3 className="text-xl font-bold text-text-primary mb-6">Emisores con Datos Disponibles</h3>

                <div className="space-y-3">
                    {issuers.length > 0 ? (
                        issuers
                            .sort((a: any, b: any) => (b.documents?.length || 0) - (a.documents?.length || 0))
                            .map((issuer: any) => {
                                const docCount = issuer.documents?.length || 0;
                                const coverage = docCount > 0 ? '100' : '0';

                                return (
                                    <Link
                                        key={issuer.id}
                                        to={`/issuer/${encodeURIComponent(issuer.id)}`}
                                        className="
                      group block p-5 bg-bg-tertiary hover:bg-bg-elevated rounded-lg
                      transition-all duration-200 border border-transparent
                      hover:border-accent-primary hover:shadow-glow-cyan
                    "
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4 flex-1">
                                                <div className="flex-shrink-0">
                                                    <BuildingOfficeIcon className="w-10 h-10 text-accent-primary" />
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-text-primary font-semibold text-lg mb-1 group-hover:text-accent-primary transition-colors">
                                                        {issuer.name}
                                                    </h4>

                                                    <div className="flex items-center gap-4 text-sm">
                                                        <span className="text-text-secondary">
                                                            {docCount} documentos procesados
                                                        </span>
                                                        <span className="text-text-tertiary">•</span>
                                                        <span className={`font-medium ${parseFloat(coverage) >= 80 ? 'text-status-success' :
                                                            parseFloat(coverage) >= 50 ? 'text-accent-primary' :
                                                                'text-status-warning'
                                                            }`}>
                                                            {coverage}% cobertura
                                                        </span>
                                                    </div>

                                                    {/* Mock last processed date */}
                                                    <div className="text-text-tertiary text-xs mt-1">
                                                        Última actualización: {new Date().toLocaleDateString('es-NI', {
                                                            year: 'numeric',
                                                            month: 'short',
                                                            day: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-6">
                                                {/* Progress Bar */}
                                                <div className="hidden md:block w-32">
                                                    <div className="h-2 bg-bg-primary rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-accent-primary transition-all duration-300"
                                                            style={{ width: `${coverage}%` }}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Icon */}
                                                <div className="flex items-center gap-2 text-text-tertiary group-hover:text-accent-primary transition-colors">
                                                    <ChartBarIcon className="w-5 h-5" />
                                                    <span className="text-sm font-medium">Ver Métricas</span>
                                                    <ArrowRightIcon className="w-4 h-4" />
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })
                    ) : (
                        <div className="text-center py-12">
                            <BuildingOfficeIcon className="w-16 h-16 text-text-tertiary mx-auto mb-4" />
                            <p className="text-text-secondary">No hay emisores procesados aún</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Help Card */}
            <div className="card bg-accent-primary/10 border border-accent-primary/20">
                <div className="flex items-start gap-4">
                    <ChartBarIcon className="w-8 h-8 text-accent-primary flex-shrink-0" />
                    <div>
                        <h4 className="text-text-primary font-semibold mb-2">
                            ¿Cómo funcionan las Métricas?
                        </h4>
                        <p className="text-text-secondary text-sm mb-4">
                            Cada emisor tiene una página de detalle con métricas financieras extraídas usando IA de sus documentos procesados.
                            Click en cualquier emisor arriba para ver ratios de liquidez, rentabilidad, solvencia, y más.
                        </p>
                        <div className="flex gap-4 text-xs">
                            <div>
                                <span className="text-text-tertiary">Extracción:</span>
                                <span className="text-accent-primary font-semibold ml-1">Gemini 2.0 Flash</span>
                            </div>
                            <div>
                                <span className="text-text-tertiary">Precisión:</span>
                                <span className="text-accent-primary font-semibold ml-1">Alta (temperature 0.1)</span>
                            </div>
                            <div>
                                <span className="text-text-tertiary">Fuente:</span>
                                <span className="text-accent-primary font-semibold ml-1">Documentos Auditados</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
}
