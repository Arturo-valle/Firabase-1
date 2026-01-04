import React, { useState, useEffect, useRef } from 'react';
import type { Issuer, IssuerMetrics } from '../types';
import ComparisonTable from './ComparisonTable';
import ComparisonCharts from './ComparisonCharts';
import { compareIssuers } from '../utils/metricsApi';
import { formatDate } from '../utils/formatters';
import { ChartBarIcon, XMarkIcon, CheckIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface IssuerComparatorProps {
    issuers: Issuer[];
}

const IssuerComparator: React.FC<IssuerComparatorProps> = ({ issuers }) => {
    const [selectedIssuerIds, setSelectedIssuerIds] = useState<string[]>([]);
    const [comparisonData, setComparisonData] = useState<IssuerMetrics[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // AbortController for cancelling fetch
    const abortControllerRef = useRef<AbortController | null>(null);

    // Clean up on unmount
    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    const handleCompare = async () => {
        if (selectedIssuerIds.length < 2) {
            setError('Selecciona al menos 2 emisores para comparar');
            return;
        }

        // Cancel previous request if any
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        const controller = new AbortController();
        abortControllerRef.current = controller;

        setLoading(true);
        setError(null);

        try {
            // Batch fetch comparison data (N+1 optimization)
            const result = await compareIssuers(selectedIssuerIds, controller.signal);

            // The API might return issuers even if some failed, or empty array
            const validMetrics = result.issuers || [];

            if (validMetrics.length === 0) {
                setError('No hay métricas disponibles para los emisores seleccionados.');
                setComparisonData([]);
            } else {
                // Check if we got data for all selected issuers
                if (validMetrics.length < selectedIssuerIds.length) {
                    const foundIds = validMetrics.map(m => m.issuerId);
                    const missingIds = selectedIssuerIds.filter(id => !foundIds.includes(id) && !foundIds.includes(id.toLowerCase()));

                    // Convert missing IDs to Names for better UX
                    const missingNames = issuers
                        .filter(i => missingIds.includes(i.id))
                        .map(i => i.name)
                        .join(', ');

                    if (missingNames) {
                        setError(`Datos parciales. Faltan: ${missingNames}`);
                    } else {
                        setError(`Solo ${validMetrics.length} de ${selectedIssuerIds.length} emisores tienen datos.`);
                    }
                }
                setComparisonData(validMetrics);
            }
        } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') {
                console.log('Comparación cancelada');
                return;
            }
            console.error('Error comparing issuers:', err);
            setError(err instanceof Error ? err.message : 'Error de conexión');
            setComparisonData([]);
        } finally {
            if (abortControllerRef.current === controller) {
                setLoading(false);
                abortControllerRef.current = null;
            }
        }
    };

    const handleToggleIssuer = (issuerId: string) => {
        setSelectedIssuerIds(prev => {
            if (prev.includes(issuerId)) {
                return prev.filter(id => id !== issuerId);
            } else {
                if (prev.length >= 4) {
                    setError('Máximo 4 emisores permitidos');
                    return prev;
                }
                setError(null);
                return [...prev, issuerId];
            }
        });
    };

    const handleClear = () => {
        setSelectedIssuerIds([]);
        setComparisonData([]);
        setError(null);
    };

    return (
        <div className="p-6 max-w-7xl mx-auto animate-fade-in space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                        <ChartBarIcon className="w-8 h-8 text-accent-primary" />
                        Matrix Comparativo
                    </h1>
                    <p className="text-text-secondary font-mono text-sm mt-1">
                        Análisis cruzado de rendimiento y solvencia.
                    </p>
                </div>
                {selectedIssuerIds.length > 0 && (
                    <button
                        onClick={handleClear}
                        className="text-xs font-mono text-status-danger hover:text-red-400 border border-status-danger/30 hover:bg-status-danger/10 px-3 py-1.5 rounded transition-all"
                    >
                        LIMPIAR SELECCIÓN
                    </button>
                )}
            </div>

            {/* Selection Panel */}
            <div className="glass-panel p-6 rounded-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                    <ChartBarIcon className="w-64 h-64 text-accent-secondary transform rotate-12" />
                </div>

                <h2 className="text-sm font-bold text-text-tertiary uppercase tracking-wider mb-4 font-mono">
                    Seleccionar Emisores ({selectedIssuerIds.length}/4)
                </h2>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 relative z-10">
                    {issuers.map(issuer => {
                        const isSelected = selectedIssuerIds.includes(issuer.id);
                        return (
                            <button
                                key={issuer.id}
                                onClick={() => handleToggleIssuer(issuer.id)}
                                className={`
                                    relative overflow-hidden group p-3 rounded-lg border text-sm font-medium transition-all duration-300 text-left
                                    ${isSelected
                                        ? 'bg-accent-primary/10 border-accent-primary text-white shadow-glow-cyan'
                                        : 'bg-black/40 border-white/10 text-text-secondary hover:border-white/30 hover:bg-white/5'
                                    }
                                `}
                            >
                                <div className="flex items-center justify-between relative z-10">
                                    <span className="truncate font-mono text-xs">{issuer.acronym || issuer.name.substring(0, 10)}</span>
                                    {isSelected && <CheckIcon className="w-4 h-4 text-accent-primary" />}
                                </div>
                                <div className="text-[10px] text-text-tertiary mt-1 truncate group-hover:text-text-secondary transition-colors">
                                    {issuer.name}
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Main Action */}
                <div className="mt-6 flex justify-end">
                    <button
                        onClick={handleCompare}
                        disabled={selectedIssuerIds.length < 2 || loading}
                        className={`
                            px-8 py-3 rounded-lg font-bold font-mono tracking-wider text-sm transition-all
                            ${selectedIssuerIds.length < 2 || loading
                                ? 'bg-white/5 text-text-disabled cursor-not-allowed border border-white/5'
                                : 'bg-accent-primary text-black hover:bg-accent-hover shadow-glow-cyan hover:scale-105'
                            }
                        `}
                    >
                        {loading ? (
                            <span className="flex items-center gap-2">
                                <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                PROCESANDO...
                            </span>
                        ) : (
                            'COMPARAR DATOS'
                        )}
                    </button>
                </div>
            </div>

            {/* Error Display */}
            {error && (
                <div className="bg-status-danger/10 border border-status-danger/30 p-4 rounded-xl flex items-center gap-3">
                    <XMarkIcon className="w-5 h-5 text-status-danger" />
                    <p className="text-status-danger text-sm font-mono">{error}</p>
                </div>
            )}

            {/* No Data State */}
            {!loading && comparisonData.length === 0 && !error && (
                <div className="border border-dashed border-white/10 rounded-2xl p-12 text-center bg-white/5">
                    <ChartBarIcon className="w-16 h-16 text-text-tertiary mx-auto mb-4 opacity-20" />
                    <p className="text-text-secondary font-mono text-sm">ESPERANDO DATOS...</p>
                </div>
            )}

            {/* Comparison Results */}
            {!loading && comparisonData.length > 0 && (
                <div className="space-y-8 animate-slide-up">
                    {/* Charts Section */}
                    <div className="glass-panel p-6 rounded-2xl">
                        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                            <span className="w-1 h-6 bg-accent-secondary rounded-full"></span>
                            Análisis Visual
                        </h3>
                        <ComparisonCharts issuers={comparisonData} />
                    </div>

                    {/* Table Section */}
                    <div className="glass-panel p-6 rounded-2xl overflow-hidden">
                        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                            <span className="w-1 h-6 bg-accent-primary rounded-full"></span>
                            Datos Fundamentales
                        </h3>
                        <div className="overflow-x-auto">
                            <ComparisonTable issuers={comparisonData} highlightBest={true} />
                        </div>
                    </div>

                    {/* Metadata Footer */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {comparisonData.map((item, idx) => (
                            <div key={idx} className="bg-black/40 border border-white/10 p-3 rounded-lg text-center">
                                <p className="text-xs font-bold text-white">{item.issuerName}</p>
                                <p className="text-[10px] text-text-tertiary font-mono mt-1">
                                    {formatDate(item.extractedAt)}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default IssuerComparator;
