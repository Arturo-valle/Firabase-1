import React, { useState, useEffect } from 'react';
import type { Issuer, MetricsData } from '../types';
import MetricCard from './MetricCard';
import { fetchIssuerMetrics, extractIssuerMetrics } from '../utils/metricsApi';
import { formatDate } from '../utils/formatters';

interface MetricsStandardizerProps {
    issuers: Issuer[];
}

const MetricsStandardizer: React.FC<MetricsStandardizerProps> = ({ issuers }) => {
    const [selectedIssuerId, setSelectedIssuerId] = useState<string>('');
    const [metrics, setMetrics] = useState<MetricsData | null>(null);
    const [loading, setLoading] = useState(false);
    const [extracting, setExtracting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const activeIssuers = issuers;

    // Load metrics when issuer is selected
    useEffect(() => {
        if (!selectedIssuerId) {
            setMetrics(null);
            return;
        }

        loadMetrics(selectedIssuerId);
    }, [selectedIssuerId]);

    const loadMetrics = async (issuerId: string) => {
        setLoading(true);
        setError(null);

        try {
            const data = await fetchIssuerMetrics(issuerId);
            setMetrics(data);
        } catch (err) {
            console.error('Error loading metrics:', err);
            setError(err instanceof Error ? err.message : 'Error al cargar métricas');
            setMetrics(null);
        } finally {
            setLoading(false);
        }
    };

    const handleExtractMetrics = async () => {
        if (!selectedIssuerId) return;

        setExtracting(true);
        setError(null);

        try {
            const data = await extractIssuerMetrics(selectedIssuerId);
            setMetrics(data);
        } catch (err) {
            console.error('Error extracting metrics:', err);
            setError(err instanceof Error ? err.message : 'Error al extraer métricas');
        } finally {
            setExtracting(false);
        }
    };

    const selectedIssuer = activeIssuers.find(i => i.id === selectedIssuerId);

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-text-primary mb-2">
                    📋 Módulo Estandarizador
                </h1>
                <p className="text-lg text-text-secondary">
                    Visualización de métricas financieras estructuradas
                </p>
            </div>

            {/* Issuer Selector */}
            <div className="card mb-6">
                <label className="block text-sm font-medium text-text-secondary mb-2">
                    Selecciona un Emisor
                </label>
                <div className="flex gap-4 items-end">
                    <select
                        value={selectedIssuerId}
                        onChange={(e) => setSelectedIssuerId(e.target.value)}
                        className="input flex-1"
                    >
                        <option value="">-- Seleccionar emisor --</option>
                        {activeIssuers.map(issuer => (
                            <option key={issuer.id} value={issuer.id}>
                                {issuer.name} {issuer.acronym ? `(${issuer.acronym})` : ''}
                            </option>
                        ))}
                    </select>

                    {selectedIssuerId && (
                        <button
                            onClick={handleExtractMetrics}
                            disabled={extracting}
                            className={`px-6 py-2 rounded-lg font-semibold text-bg-primary transition-all ${extracting
                                ? 'bg-text-disabled cursor-not-allowed'
                                : 'bg-accent-primary hover:bg-accent-hover shadow-lg hover:shadow-glow'
                                }`}
                        >
                            {extracting ? '⏳ Extrayendo...' : '✨ Extraer Métricas'}
                        </button>
                    )}
                </div>
            </div>

            {/* Error State */}
            {error && (
                <div className="bg-red-900/20 border border-status-danger/50 rounded-xl p-4 mb-6">
                    <p className="text-status-danger text-sm">⚠️ {error}</p>
                </div>
            )}

            {/* Loading State */}
            {loading && (
                <div className="card p-12 text-center">
                    <div className="animate-spin w-12 h-12 border-4 border-accent-primary border-t-transparent rounded-full mx-auto mb-4" />
                    <p className="text-text-secondary">Cargando métricas...</p>
                </div>
            )}

            {/* No Issuer Selected */}
            {!selectedIssuerId && !loading && (
                <div className="card p-12 text-center border-dashed border-2 border-border-subtle bg-transparent">
                    <div className="text-6xl mb-4 grayscale opacity-50">📊</div>
                    <h3 className="text-xl font-semibold text-text-primary mb-2">
                        Selecciona un Emisor
                    </h3>
                    <p className="text-text-secondary">
                        Elige un emisor del menú desplegable para ver sus métricas financieras
                    </p>
                </div>
            )}

            {/* No Metrics Available */}
            {selectedIssuerId && !loading && !metrics && !error && (
                <div className="bg-bg-tertiary border border-status-warning/30 rounded-xl p-8 text-center">
                    <div className="text-5xl mb-4">📥</div>
                    <h3 className="text-xl font-semibold text-status-warning mb-2">
                        No hay métricas disponibles
                    </h3>
                    <p className="text-text-secondary mb-4">
                        Las métricas para <strong>{selectedIssuer?.name}</strong> aún no han sido extraídas.
                    </p>
                    <button
                        onClick={handleExtractMetrics}
                        disabled={extracting}
                        className="px-6 py-3 bg-status-warning hover:bg-yellow-600 text-bg-primary rounded-lg font-semibold transition-all"
                    >
                        {extracting ? '⏳ Extrayendo...' : '✨ Extraer Métricas Ahora'}
                    </button>
                </div>
            )}

            {/* Metrics Display */}
            {selectedIssuerId && metrics && !loading && (
                <>
                    {/* Metadata */}
                    <div className="bg-bg-tertiary border border-border-subtle rounded-xl p-4 mb-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                            <div>
                                <span className="text-text-secondary font-medium">Emisor:</span>
                                <p className="text-text-primary font-semibold">{metrics.issuerName}</p>
                            </div>
                            <div>
                                <span className="text-text-secondary font-medium">Período:</span>
                                <p className="text-text-primary font-semibold">{metrics.metadata?.periodo || 'N/D'}</p>
                            </div>
                            <div>
                                <span className="text-text-secondary font-medium">Moneda:</span>
                                <p className="text-text-primary font-semibold">{metrics.metadata?.moneda || 'N/D'}</p>
                            </div>
                            <div>
                                <span className="text-text-secondary font-medium">Última Actualización:</span>
                                <p className="text-text-primary font-semibold">
                                    {formatDate(metrics.extractedAt)}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Liquidez Section */}
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-text-primary mb-4 flex items-center gap-2">
                            <span>💧</span> Liquidez
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <MetricCard
                                icon="💧"
                                label="Ratio Circulante"
                                value={metrics.liquidez.ratioCirculante}
                                unit="x"
                                color="blue"
                                subtitle="Activo Circulante / Pasivo Circulante"
                            />
                            <MetricCard
                                icon="⚡"
                                label="Prueba Ácida"
                                value={metrics.liquidez.pruebaAcida}
                                unit="x"
                                color="blue"
                            />
                            <MetricCard
                                icon="💰"
                                label="Capital de Trabajo"
                                value={metrics.liquidez.capitalTrabajo}
                                unit="M"
                                color="blue"
                            />
                        </div>
                    </div>

                    {/* Solvencia Section */}
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-text-primary mb-4 flex items-center gap-2">
                            <span>🛡️</span> Solvencia
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <MetricCard
                                icon="📊"
                                label="Deuda / Activos"
                                value={metrics.solvencia.deudaActivos}
                                unit="%"
                                color="green"
                            />
                            <MetricCard
                                icon="⚖️"
                                label="Deuda / Patrimonio"
                                value={metrics.solvencia.deudaPatrimonio}
                                unit="x"
                                color="green"
                            />
                            <MetricCard
                                icon="🔒"
                                label="Cobertura de Intereses"
                                value={metrics.solvencia.coberturIntereses}
                                unit="x"
                                color="green"
                            />
                        </div>
                    </div>

                    {/* Rentabilidad Section */}
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-text-primary mb-4 flex items-center gap-2">
                            <span>💰</span> Rentabilidad
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <MetricCard
                                icon="📈"
                                label="ROE"
                                value={metrics.rentabilidad.roe}
                                unit="%"
                                color="amber"
                                subtitle="Return on Equity"
                            />
                            <MetricCard
                                icon="📊"
                                label="ROA"
                                value={metrics.rentabilidad.roa}
                                unit="%"
                                color="amber"
                                subtitle="Return on Assets"
                            />
                            <MetricCard
                                icon="💵"
                                label="Margen Neto"
                                value={metrics.rentabilidad.margenNeto}
                                unit="%"
                                color="amber"
                            />
                            <MetricCard
                                icon="✨"
                                label="Utilidad Neta"
                                value={metrics.rentabilidad.utilidadNeta}
                                unit="M"
                                color="amber"
                            />
                        </div>
                    </div>

                    {/* Eficiencia Section */}
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-text-primary mb-4 flex items-center gap-2">
                            <span>⚡</span> Eficiencia
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <MetricCard
                                icon="🔄"
                                label="Rotación de Activos"
                                value={metrics.eficiencia.rotacionActivos}
                                unit="x"
                                color="purple"
                            />
                            <MetricCard
                                icon="📦"
                                label="Rotación de Cartera"
                                value={metrics.eficiencia.rotacionCartera}
                                unit="x"
                                color="purple"
                            />
                            <MetricCard
                                icon="⚠️"
                                label="Tasa de Morosidad"
                                value={metrics.eficiencia.morosidad}
                                unit="%"
                                color="purple"
                            />
                        </div>
                    </div>

                    {/* Capital Section */}
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-text-primary mb-4 flex items-center gap-2">
                            <span>📊</span> Estructura de Capital
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <MetricCard
                                icon="💎"
                                label="Activos Totales"
                                value={metrics.capital.activosTotales}
                                unit="M"
                                color="red"
                            />
                            <MetricCard
                                icon="🏛️"
                                label="Patrimonio"
                                value={metrics.capital.patrimonio}
                                unit="M"
                                color="red"
                            />
                            <MetricCard
                                icon="📉"
                                label="Pasivos Totales"
                                value={metrics.capital.pasivos}
                                unit="M"
                                color="red"
                            />
                        </div>
                    </div>

                    {/* Calificación Section */}
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-text-primary mb-4 flex items-center gap-2">
                            <span>⭐</span> Calificación de Riesgo
                        </h2>
                        <div className="card">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="text-center">
                                    <p className="text-sm text-text-secondary font-medium mb-2">CALIFICACIÓN</p>
                                    <p className="text-4xl font-bold text-accent-secondary">
                                        {metrics.calificacion.rating || 'N/D'}
                                    </p>
                                </div>
                                <div className="text-center">
                                    <p className="text-sm text-text-secondary font-medium mb-2">PERSPECTIVA</p>
                                    <p className="text-2xl font-semibold text-text-primary capitalize">
                                        {metrics.calificacion.perspectiva || 'N/D'}
                                    </p>
                                </div>
                                <div className="text-center">
                                    <p className="text-sm text-text-secondary font-medium mb-2">ÚLTIMA CALIFICACIÓN</p>
                                    <p className="text-2xl font-semibold text-text-primary">
                                        {metrics.calificacion.fecha || 'N/D'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Metadata Footer */}
                    {metrics.chunksAnalyzed && (
                        <div className="bg-bg-tertiary border border-border-subtle rounded-xl p-4 text-center text-sm text-text-secondary">
                            <p>
                                Métricas extraídas de <strong>{metrics.chunksAnalyzed}</strong> fragmentos de documentos
                                {metrics.metadata?.fuente && (
                                    <> • Fuente: <strong>{metrics.metadata.fuente}</strong></>
                                )}
                            </p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default MetricsStandardizer;
