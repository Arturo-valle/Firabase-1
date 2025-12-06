import React, { useState } from 'react';
import type { Issuer, IssuerMetrics } from '../types';
import ComparisonTable from './ComparisonTable';
import ComparisonCharts from './ComparisonCharts';
import { fetchIssuerMetrics } from '../utils/metricsApi';

interface IssuerComparatorProps {
    issuers: Issuer[];
}

const IssuerComparator: React.FC<IssuerComparatorProps> = ({ issuers }) => {
    const [selectedIssuerIds, setSelectedIssuerIds] = useState<string[]>([]);
    const [comparisonData, setComparisonData] = useState<IssuerMetrics[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const activeIssuers = issuers;

    const handleCompare = async () => {
        if (selectedIssuerIds.length < 2) {
            setError('Por favor selecciona al menos 2 emisores para comparar');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Fetch metrics for all selected issuers in parallel
            const metricsPromises = selectedIssuerIds.map(id => fetchIssuerMetrics(id));
            const results = await Promise.all(metricsPromises);

            // Filter out null results (issuers without metrics)
            const validMetrics = results.filter(m => m !== null) as IssuerMetrics[];

            if (validMetrics.length === 0) {
                setError('Ninguno de los emisores seleccionados tiene métricas disponibles. Por favor extrae las métricas primero en el Módulo Estandarizador.');
                setComparisonData([]);
            } else if (validMetrics.length < selectedIssuerIds.length) {
                setError(`Solo ${validMetrics.length} de ${selectedIssuerIds.length} emisores tienen métricas disponibles.`);
                setComparisonData(validMetrics);
            } else {
                setComparisonData(validMetrics);
            }
        } catch (err) {
            console.error('Error comparing issuers:', err);
            setError(err instanceof Error ? err.message : 'Error al comparar emisores');
            setComparisonData([]);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleIssuer = (issuerId: string) => {
        setSelectedIssuerIds(prev => {
            if (prev.includes(issuerId)) {
                return prev.filter(id => id !== issuerId);
            } else {
                if (prev.length >= 4) {
                    setError('Máximo 4 emisores para comparar');
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
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-text-primary mb-2">
                    📈 Módulo Comparador
                </h1>
                <p className="text-lg text-text-secondary">
                    Comparación lado a lado de métricas financieras
                </p>
            </div>

            {/* Issuer Selection */}
            <div className="card mb-6">
                <h2 className="text-lg font-semibold text-text-primary mb-4">
                    Selecciona Emisores (2-4)
                </h2>

                {/* Grid of issuer chips */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-4">
                    {activeIssuers.map(issuer => {
                        const isSelected = selectedIssuerIds.includes(issuer.id);

                        return (
                            <button
                                key={issuer.id}
                                onClick={() => handleToggleIssuer(issuer.id)}
                                className={`p-3 rounded-lg border transition-all text-sm font-medium ${isSelected
                                    ? 'border-accent-primary bg-accent-primary/10 text-accent-primary shadow-glow'
                                    : 'border-border-subtle bg-bg-tertiary text-text-secondary hover:border-accent-primary/50 hover:text-text-primary'
                                    }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="truncate">
                                        {issuer.acronym || issuer.name}
                                    </span>
                                    {isSelected && <span className="ml-2 text-accent-primary">✓</span>}
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Selected issuers display */}
                {selectedIssuerIds.length > 0 && (
                    <div className="bg-bg-tertiary border border-border-subtle rounded-lg p-4 mb-4">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm text-text-primary font-medium">
                                Seleccionados ({selectedIssuerIds.length}/4):
                            </p>
                            <button
                                onClick={handleClear}
                                className="text-sm text-accent-primary hover:text-accent-hover font-medium"
                            >
                                Limpiar
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {selectedIssuerIds.map(id => {
                                const issuer = activeIssuers.find(i => i.id === id);
                                return issuer ? (
                                    <span key={id} className="inline-flex items-center gap-1 bg-accent-primary/20 text-accent-primary border border-accent-primary/30 px-3 py-1 rounded-full text-sm">
                                        {issuer.name}
                                        <button
                                            onClick={() => handleToggleIssuer(id)}
                                            className="hover:bg-accent-primary/20 rounded-full px-1 transition-colors"
                                        >
                                            ×
                                        </button>
                                    </span>
                                ) : null;
                            })}
                        </div>
                    </div>
                )}

                {/* Compare Button */}
                <button
                    onClick={handleCompare}
                    disabled={selectedIssuerIds.length < 2 || loading}
                    className={`w-full py-3 px-6 rounded-lg font-bold text-bg-primary transition-all ${selectedIssuerIds.length < 2 || loading
                        ? 'bg-text-disabled cursor-not-allowed'
                        : 'bg-accent-primary hover:bg-accent-hover shadow-lg hover:shadow-glow'
                        }`}
                >
                    {loading ? '⏳ Comparando...' : '🔍 Comparar Emisores'}
                </button>
            </div>

            {/* Error Display */}
            {error && (
                <div className="bg-red-900/20 border border-status-danger/50 rounded-xl p-4 mb-6">
                    <p className="text-status-danger text-sm">⚠️ {error}</p>
                </div>
            )}

            {/* Loading State */}
            {loading && (
                <div className="card p-12 text-center">
                    <div className="animate-spin w-12 h-12 border-4 border-accent-primary border-t-transparent rounded-full mx-auto mb-4" />
                    <p className="text-text-secondary">Cargando métricas para comparación...</p>
                </div>
            )}

            {/* No Comparison Yet */}
            {!loading && comparisonData.length === 0 && !error && (
                <div className="card p-12 text-center border-dashed border-2 border-border-subtle bg-transparent">
                    <div className="text-6xl mb-4 grayscale opacity-50">📊</div>
                    <h3 className="text-xl font-semibold text-text-primary mb-2">
                        Selecciona Emisores para Comparar
                    </h3>
                    <p className="text-text-secondary">
                        Elige entre 2 y 4 emisores y haz clic en "Comparar Emisores" para ver el análisis comparativo
                    </p>
                </div>
            )}

            {/* Comparison Results */}
            {!loading && comparisonData.length > 0 && (
                <div className="space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-bg-secondary border border-border-subtle rounded-xl p-6 text-text-primary shadow-sm hover:border-accent-primary/50 transition-colors">
                            <p className="text-sm text-text-secondary mb-1">Emisores Comparados</p>
                            <p className="text-4xl font-bold text-text-primary">{comparisonData.length}</p>
                        </div>
                        <div className="bg-bg-secondary border border-border-subtle rounded-xl p-6 text-text-primary shadow-sm hover:border-accent-secondary/50 transition-colors">
                            <p className="text-sm text-text-secondary mb-1">Métricas Analizadas</p>
                            <p className="text-4xl font-bold text-text-primary">20+</p>
                        </div>
                        <div className="bg-bg-secondary border border-border-subtle rounded-xl p-6 text-text-primary shadow-sm hover:border-purple-500/50 transition-colors">
                            <p className="text-sm text-text-secondary mb-1">Categorías</p>
                            <p className="text-4xl font-bold text-text-primary">6</p>
                        </div>
                    </div>

                    {/* Charts */}
                    <div>
                        <h2 className="text-2xl font-bold text-text-primary mb-4">
                            Visualizaciones Comparativas
                        </h2>
                        <ComparisonCharts issuers={comparisonData} />
                    </div>

                    {/* Table */}
                    <div>
                        <h2 className="text-2xl font-bold text-text-primary mb-4">
                            Tabla Comparativa Detallada
                        </h2>
                        <ComparisonTable issuers={comparisonData} highlightBest={true} />
                    </div>

                    {/* Metadata Footer */}
                    <div className="bg-bg-tertiary border border-border-subtle rounded-xl p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                            {comparisonData.map((issuer, idx) => (
                                <div key={idx} className="text-center">
                                    <p className="text-text-primary font-medium">{issuer.issuerName}</p>
                                    <p className="text-text-tertiary text-xs mt-1">
                                        Período: {issuer.metadata?.periodo || 'N/D'}
                                    </p>
                                    <p className="text-text-tertiary text-xs">
                                        Actualizado: {issuer.extractedAt
                                            ? new Date(issuer.extractedAt).toLocaleDateString('es-NI')
                                            : 'N/D'}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default IssuerComparator;
