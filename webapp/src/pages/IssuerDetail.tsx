import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    BuildingOfficeIcon,
    ChartBarIcon,
    SparklesIcon,
    ArrowTrendingUpIcon,
    ArrowTrendingDownIcon
} from '@heroicons/react/24/outline';

import InsightCard from '../components/ai/InsightCard';

const API_BASE_URL = 'https://us-central1-mvp-nic-market.cloudfunctions.net/api';

interface Metrics {
    liquidez?: {
        ratioCirculante?: number;
        pruebaAcida?: number;
        capitalTrabajo?: number;
    };
    solvencia?: {
        deudaActivos?: number;
        deudaPatrimonio?: number;
        coberturIntereses?: number;
    };
    rentabilidad?: {
        roe?: number;
        roa?: number;
        margenNeto?: number;
        utilidadNeta?: number;
    };
    capital?: {
        activosTotales?: number;
        patrimonio?: number;
        pasivos?: number;
    };
    calificacion?: {
        rating?: string;
        perspectiva?: string;
        fecha?: string;
    };
    metadata?: {
        periodo?: string;
        moneda?: string;
        fuente?: string;
    };
}

export default function IssuerDetail() {
    const { issuerId } = useParams<{ issuerId: string }>();
    const navigate = useNavigate();
    const [metrics, setMetrics] = useState<Metrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [extracting, setExtracting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadMetrics();
    }, [issuerId]);

    async function loadMetrics() {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch(`${API_BASE_URL}/metrics/${encodeURIComponent(issuerId!)}`);

            if (response.status === 404) {
                // No cached metrics, prompt to extract
                setMetrics(null);
            } else if (response.ok) {
                const data = await response.json();
                setMetrics(data.metrics);
            } else {
                throw new Error('Failed to load metrics');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function extractMetrics() {
        try {
            setExtracting(true);
            setError(null);

            const response = await fetch(`${API_BASE_URL}/metrics/extract/${encodeURIComponent(issuerId!)}`, {
                method: 'POST',
            });

            if (!response.ok) {
                throw new Error('Failed to extract metrics');
            }

            const data = await response.json();
            setMetrics(data.metrics);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setExtracting(false);
        }
    }

    const formatNumber = (value: number | null | undefined, decimals = 2) => {
        if (value === null || value === undefined) return 'N/D';
        return value.toLocaleString('es-NI', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        });
    };

    const getRatingColor = (rating: string | undefined) => {
        if (!rating) return 'text-text-tertiary';
        if (rating.startsWith('AA')) return 'text-status-success';
        if (rating.startsWith('A')) return 'text-accent-primary';
        if (rating.startsWith('B')) return 'text-status-warning';
        return 'text-status-danger';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="animate-spin w-12 h-12 border-4 border-accent-primary border-t-transparent rounded-full mx-auto mb-4" />
                    <p className="text-text-secondary">Cargando métricas...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <BuildingOfficeIcon className="w-12 h-12 text-accent-primary" />
                    <div>
                        <h2 className="text-3xl font-bold text-text-primary">{issuerId}</h2>
                        {metrics?.metadata && (
                            <p className="text-text-secondary">
                                Período: {metrics.metadata.periodo} • {metrics.metadata.moneda}
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={() => navigate(`/ai-assistant?issuerId=${encodeURIComponent(issuerId!)}`)}
                        className="btn-secondary flex items-center gap-2"
                    >
                        <SparklesIcon className="w-5 h-5" />
                        Generar Reporte de Inversión
                    </button>

                    {metrics ? (
                        <button
                            onClick={extractMetrics}
                            disabled={extracting}
                            className="btn-secondary flex items-center gap-2"
                            title="Recalcular métricas con los documentos más recientes"
                        >
                            <ArrowTrendingUpIcon className="w-5 h-5" />
                            {extracting ? 'Calculando...' : 'Recalcular Métricas'}
                        </button>
                    ) : (
                        <button
                            onClick={extractMetrics}
                            disabled={extracting}
                            className="btn-primary flex items-center gap-2"
                        >
                            <SparklesIcon className="w-5 h-5" />
                            {extracting ? 'Extrayendo...' : 'Extraer Métricas con IA'}
                        </button>
                    )}
                </div>
            </div>

            {error && (
                <div className="card bg-status-danger/10 border border-status-danger/20">
                    <p className="text-status-danger">Error: {error}</p>
                </div>
            )}

            {!metrics && !extracting && (
                <div className="card bg-accent-primary/10 border border-accent-primary/20">
                    <div className="flex items-start gap-4">
                        <SparklesIcon className="w-8 h-8 text-accent-primary flex-shrink-0" />
                        <div>
                            <h4 className="text-text-primary font-semibold mb-2">
                                Métricas Financieras No Extraídas
                            </h4>
                            <p className="text-text-secondary text-sm mb-4">
                                Este emisor tiene documentos procesados, pero las métricas estructuradas aún no han sido extraídas.
                                Usa el botón "Extraer Métricas con IA" para generar un análisis completo.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {metrics && (
                <>
                    {/* AI Insight Card */}
                    <InsightCard issuerId={issuerId!} issuerName={issuerId!} />

                    {/* Calificación Crediticia */}
                    {metrics.calificacion?.rating && (
                        <div className="card">
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="text-text-tertiary text-sm uppercase">Calificación Crediticia</span>
                                    <div className="flex items-baseline gap-3 mt-2">
                                        <span className={`text-5xl font-bold ${getRatingColor(metrics.calificacion.rating)}`}>
                                            {metrics.calificacion.rating}
                                        </span>
                                        {metrics.calificacion.perspectiva && (
                                            <span className="text-text-secondary flex items-center gap-1">
                                                {metrics.calificacion.perspectiva === 'positive' && <ArrowTrendingUpIcon className="w-4 h-4 text-status-success" />}
                                                {metrics.calificacion.perspectiva === 'negative' && <ArrowTrendingDownIcon className="w-4 h-4 text-status-danger" />}
                                                {metrics.calificacion.perspectiva}
                                            </span>
                                        )}
                                    </div>
                                    {metrics.calificacion.fecha && (
                                        <p className="text-text-tertiary text-sm mt-1">
                                            Última actualización: {metrics.calificacion.fecha}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Métricas Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Liquidez */}
                        {metrics.liquidez && Object.values(metrics.liquidez).some(v => v !== null) && (
                            <div className="card">
                                <h4 className="text-text-primary font-semibold mb-4 flex items-center gap-2">
                                    <ChartBarIcon className="w-5 h-5 text-accent-primary" />
                                    Liquidez
                                </h4>
                                <div className="space-y-3">
                                    {metrics.liquidez.ratioCirculante !== null && (
                                        <div>
                                            <span className="text-text-tertiary text-sm">Ratio Circulante</span>
                                            <p className="text-text-primary text-2xl font-bold">
                                                {formatNumber(metrics.liquidez.ratioCirculante)}x
                                            </p>
                                        </div>
                                    )}
                                    {metrics.liquidez.pruebaAcida !== null && (
                                        <div>
                                            <span className="text-text-tertiary text-sm">Prueba Ácida</span>
                                            <p className="text-text-primary text-2xl font-bold">
                                                {formatNumber(metrics.liquidez.pruebaAcida)}x
                                            </p>
                                        </div>
                                    )}
                                    {metrics.liquidez.capitalTrabajo !== null && (
                                        <div>
                                            <span className="text-text-tertiary text-sm">Capital de Trabajo (M)</span>
                                            <p className="text-text-primary text-2xl font-bold">
                                                {formatNumber(metrics.liquidez.capitalTrabajo, 1)}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Rentabilidad */}
                        {metrics.rentabilidad && Object.values(metrics.rentabilidad).some(v => v !== null) && (
                            <div className="card">
                                <h4 className="text-text-primary font-semibold mb-4">Rentabilidad</h4>
                                <div className="space-y-3">
                                    {metrics.rentabilidad.roe !== null && (
                                        <div>
                                            <span className="text-text-tertiary text-sm">ROE</span>
                                            <p className="text-text-primary text-2xl font-bold">
                                                {formatNumber(metrics.rentabilidad.roe)}%
                                            </p>
                                        </div>
                                    )}
                                    {metrics.rentabilidad.roa !== null && (
                                        <div>
                                            <span className="text-text-tertiary text-sm">ROA</span>
                                            <p className="text-text-primary text-2xl font-bold">
                                                {formatNumber(metrics.rentabilidad.roa)}%
                                            </p>
                                        </div>
                                    )}
                                    {metrics.rentabilidad.margenNeto !== null && (
                                        <div>
                                            <span className="text-text-tertiary text-sm">Margen Neto</span>
                                            <p className="text-text-primary text-2xl font-bold">
                                                {formatNumber(metrics.rentabilidad.margenNeto)}%
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Solvencia */}
                        {metrics.solvencia && Object.values(metrics.solvencia).some(v => v !== null) && (
                            <div className="card">
                                <h4 className="text-text-primary font-semibold mb-4">Solvencia</h4>
                                <div className="space-y-3">
                                    {metrics.solvencia.deudaActivos !== null && (
                                        <div>
                                            <span className="text-text-tertiary text-sm">Deuda/Activos</span>
                                            <p className="text-text-primary text-2xl font-bold">
                                                {formatNumber(metrics.solvencia.deudaActivos)}%
                                            </p>
                                        </div>
                                    )}
                                    {metrics.solvencia.deudaPatrimonio !== null && (
                                        <div>
                                            <span className="text-text-tertiary text-sm">Deuda/Patrimonio</span>
                                            <p className="text-text-primary text-2xl font-bold">
                                                {formatNumber(metrics.solvencia.deudaPatrimonio)}x
                                            </p>
                                        </div>
                                    )}
                                    {metrics.solvencia.coberturIntereses !== null && (
                                        <div>
                                            <span className="text-text-tertiary text-sm">Cobertura de Intereses</span>
                                            <p className="text-text-primary text-2xl font-bold">
                                                {formatNumber(metrics.solvencia.coberturIntereses)}x
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Balance General */}
                    {metrics.capital && Object.values(metrics.capital).some(v => v !== null) && (
                        <div className="card">
                            <h4 className="text-text-primary font-semibold mb-4">Balance General (Millones)</h4>
                            <div className="grid grid-cols-3 gap-6">
                                {metrics.capital.activosTotales !== null && (
                                    <div>
                                        <span className="text-text-tertiary text-sm">Activos Totales</span>
                                        <p className="text-text-primary text-3xl font-bold">
                                            {formatNumber(metrics.capital.activosTotales, 1)}
                                        </p>
                                    </div>
                                )}
                                {metrics.capital.pasivos !== null && (
                                    < div>
                                        <span className="text-text-tertiary text-sm">Pasivos</span>
                                        <p className="text-text-primary text-3xl font-bold">
                                            {formatNumber(metrics.capital.pasivos, 1)}
                                        </p>
                                    </div>
                                )}
                                {metrics.capital.patrimonio !== null && (
                                    <div>
                                        <span className="text-text-tertiary text-sm">Patrimonio</span>
                                        <p className="text-text-primary text-3xl font-bold">
                                            {formatNumber(metrics.capital.patrimonio, 1)}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Source */}
                    {metrics.metadata?.fuente && (
                        <div className="card bg-bg-tertiary">
                            <p className="text-text-tertiary text-sm">
                                Fuente de datos: {metrics.metadata.fuente}
                            </p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
