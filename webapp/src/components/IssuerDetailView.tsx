import React, { useState, useEffect } from 'react';
import type { Issuer, Document, IssuerMetrics } from '../types';
import { formatDate, formatCurrency, formatPercentage, formatRatio, formatNumber } from '../utils/formatters';
import { fetchMetricsComparison, fetchIssuerHistory } from '../utils/marketDataApi';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer
} from 'recharts';
import {
    ArrowLeftIcon,
    DocumentTextIcon,
    ChartBarIcon,
    CpuChipIcon,
    ArrowTrendingUpIcon,
    ArrowTrendingDownIcon,
    BuildingLibraryIcon,
    ScaleIcon
} from '@heroicons/react/24/outline';

// --- Types ---
interface IssuerDetailViewProps {
    issuer: Issuer;
    onBack: () => void;
}

interface HistoricalPoint {
    period: string;
    date: string;
    activosTotales?: number;
    utilidadNeta?: number;
    roe?: number;
}

// --- Components ---

interface MetricCardProps {
    label: string;
    value: string | number;
    subValue?: string | null;
    trend?: 'up' | 'down' | 'neutral';
    icon: React.ElementType;
    color: string;
}

const MetricCard = ({ label, value, subValue, trend, icon: Icon, color }: MetricCardProps) => (
    <div className="glass-panel p-5 relative overflow-hidden group hover:shadow-glow-cyan transition-all duration-300">
        <div className={`absolute -right-6 -top-6 p-4 opacity-5 group-hover:opacity-10 transition-opacity text-${color}-400 rounded-full bg-${color}-400/20 blur-xl`}>
            <Icon className="w-32 h-32" />
        </div>
        <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-5 h-5 text-${color}-400`} />
                <p className="text-text-secondary text-xs font-mono uppercase tracking-wider">{label}</p>
            </div>
            <h3 className="text-3xl font-bold text-text-primary font-mono tracking-tight">{value}</h3>
            {subValue && (
                <div className="flex items-center gap-2 mt-2">
                    {trend === 'up' ? (
                        <ArrowTrendingUpIcon className="w-4 h-4 text-status-success" />
                    ) : trend === 'down' ? (
                        <ArrowTrendingDownIcon className="w-4 h-4 text-status-danger" />
                    ) : null}
                    <p className={`text-xs font-mono ${trend === 'up' ? 'text-status-success' : trend === 'down' ? 'text-status-danger' : 'text-text-tertiary'}`}>
                        {subValue}
                    </p>
                </div>
            )}
        </div>
    </div>
);

const DocumentRow = ({ doc }: { doc: Document }) => {
    let type = 'OTRO';
    let typeColor = 'text-text-tertiary';
    let badgeColor = 'bg-gray-500/10 border-gray-500/20';

    const lowerTitle = (doc.title || '').toLowerCase();
    if (lowerTitle.includes('financiero') || lowerTitle.includes('auditado')) {
        type = 'FINANCIERO';
        typeColor = 'text-blue-400';
        badgeColor = 'bg-blue-500/10 border-blue-500/20';
    } else if (lowerTitle.includes('calificaci') || lowerTitle.includes('riesgo')) {
        type = 'RIESGO';
        typeColor = 'text-purple-400';
        badgeColor = 'bg-purple-500/10 border-purple-500/20';
    } else if (lowerTitle.includes('hecho') || lowerTitle.includes('relevante')) {
        type = 'HECHO RELEVANTE';
        typeColor = 'text-amber-400';
        badgeColor = 'bg-amber-500/10 border-amber-500/20';
    } else if (lowerTitle.includes('prospecto')) {
        type = 'LEGAL';
        typeColor = 'text-emerald-400';
        badgeColor = 'bg-emerald-500/10 border-emerald-500/20';
    }

    return (
        <a
            href={doc.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center justify-between p-3 border-b border-white/5 hover:bg-white/5 transition-colors"
        >
            <div className="flex items-center gap-4 overflow-hidden">
                <div className={`p-1.5 rounded-lg border ${badgeColor}`}>
                    <DocumentTextIcon className={`w-4 h-4 ${typeColor}`} />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-sm text-text-secondary group-hover:text-accent-primary truncate transition-colors font-mono">
                        {doc.title}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                        <span className={`text-[10px] font-bold tracking-wider ${typeColor}`}>
                            {type}
                        </span>
                        <span className="text-[10px] text-text-tertiary font-mono">{formatDate(doc.date)}</span>
                    </div>
                </div>
            </div>
            <ArrowTrendingUpIcon className="w-4 h-4 text-accent-primary opacity-0 group-hover:opacity-100 -rotate-45 transition-all transform group-hover:translate-x-1" />
        </a>
    );
};

// --- Main View ---

const IssuerDetailView: React.FC<IssuerDetailViewProps> = ({ issuer, onBack }) => {
    const [metrics, setMetrics] = useState<IssuerMetrics | null>(null);
    const [history, setHistory] = useState<HistoricalPoint[]>([]);
    const [loading, setLoading] = useState(true);


    const FALLBACK_LOGO_URL = 'https://www.bolsanic.com/wp-content/uploads/2016/12/logo.png';

    useEffect(() => {
        let isMounted = true;
        const loadData = async () => {
            setLoading(true);
            try {
                // 1. Fetch Latest Metrics
                const metricsData = await fetchMetricsComparison([issuer.id]);
                if (isMounted && metricsData && metricsData.length > 0) {
                    setMetrics(metricsData[0].metrics);
                }

                // 2. Fetch History
                const historyData = await fetchIssuerHistory(issuer.id);
                if (isMounted && Array.isArray(historyData)) {
                    // Sort by date ascending
                    const sorted = historyData.sort((a: HistoricalPoint, b: HistoricalPoint) => new Date(a.date).getTime() - new Date(b.date).getTime());
                    setHistory(sorted);
                }
            } catch (err) {
                console.error("Error loading issuer details:", err);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        if (issuer.id) loadData();
        return () => { isMounted = false; };
    }, [issuer.id]);

    // Prepare chart data
    const chartData = history.map(h => ({
        period: h.period,
        Activos: h.activosTotales || 0,
        Utilidad: h.utilidadNeta || 0,
        ROE: h.roe || 0
    }));

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[400px]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-accent-primary border-t-transparent rounded-full animate-spin"></div>
                    <div className="text-text-secondary font-mono text-sm tracking-wider animate-pulse">CARGANDO DATOS...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full animate-fade-in gap-8">
            {/* --- Top Bar: Navigation --- */}
            <div>
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-text-tertiary hover:text-accent-primary transition-colors group mb-4"
                >
                    <ArrowLeftIcon className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    <span className="text-sm font-mono uppercase tracking-wider">Volver al Mercado</span>
                </button>
            </div>

            {/* --- Hero Header --- */}
            <div className="relative glass-panel rounded-2xl p-8 overflow-hidden">
                {/* Background Glow */}
                <div className="absolute top-0 right-0 w-1/2 h-full bg-accent-primary/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-8">
                    <div className="w-24 h-24 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 flex-shrink-0 flex items-center justify-center shadow-lg">
                        <img
                            src={issuer.logoUrl || FALLBACK_LOGO_URL}
                            alt={issuer.name}
                            className="max-w-full max-h-full object-contain filter brightness-110 contrast-125"
                            onError={(e) => { e.currentTarget.src = FALLBACK_LOGO_URL; }}
                        />
                    </div>

                    <div className="flex-1 text-center md:text-left">
                        <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                            {issuer.acronym && (
                                <span className="bg-accent-primary/10 text-accent-primary border border-accent-primary/20 px-2 py-0.5 rounded text-xs font-mono font-bold tracking-wider">
                                    {issuer.acronym}
                                </span>
                            )}
                            <span className="text-xs text-text-tertiary font-mono">ID: {issuer.id.toUpperCase()}</span>
                        </div>

                        <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-2">
                            {issuer.name}
                        </h1>

                        <div className="flex items-center justify-center md:justify-start gap-4 text-sm text-text-secondary">
                            <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${issuer.sector === 'Público' ? 'bg-blue-500 shadow-glow-blue' : 'bg-emerald-500 shadow-glow-green'}`} />
                                <span>{issuer.sector || 'Sector No Definido'}</span>
                            </div>
                            {metrics?.calificacion?.rating && (
                                <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/5 border border-white/10">
                                    <span className="text-xs text-text-tertiary uppercase">Rating</span>
                                    <span className="font-mono font-bold text-white">{metrics.calificacion.rating}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* --- Metric KPIs (Terminal Style) --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                    label="Activos Totales"
                    value={metrics ? formatCurrency(metrics.capital?.activosTotales) : '---'}
                    subValue={metrics?.metadata?.moneda || 'USD'}
                    icon={BuildingLibraryIcon}
                    color="blue"
                />
                <MetricCard
                    label="Utilidad Neta"
                    value={metrics ? formatCurrency(metrics.rentabilidad?.utilidadNeta) : '---'}
                    subValue={metrics?.rentabilidad?.roe ? `ROE: ${formatPercentage(metrics.rentabilidad.roe)}` : null}
                    trend={metrics?.rentabilidad?.utilidadNeta && metrics.rentabilidad.utilidadNeta > 0 ? 'up' : 'down'}
                    icon={ChartBarIcon}
                    color="green"
                />
                <MetricCard
                    label="Nivel de Deuda"
                    value={metrics ? formatRatio(metrics.solvencia?.deudaPatrimonio) : '---'}
                    subValue="Deuda / Patrimonio"
                    icon={ScaleIcon}
                    color="amber"
                />
                <MetricCard
                    label="Liquidez"
                    value={metrics ? formatRatio(metrics.liquidez?.ratioCirculante) : '---'}
                    subValue={metrics?.liquidez?.pruebaAcida ? `Acida: ${formatRatio(metrics.liquidez.pruebaAcida)}` : null}
                    icon={CpuChipIcon}
                    color="purple"
                />
            </div>

            {/* --- Main Dashboard Content --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column: Visuals & Intelligence (2/3) */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                    {/* Financial Chart */}
                    <div className="glass-panel p-6 rounded-2xl relative overflow-hidden">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                <ArrowTrendingUpIcon className="w-5 h-5 text-accent-primary" />
                                Desempeño Financiero
                            </h3>
                            <div className="flex gap-4">
                                <div className="flex items-center gap-2 text-xs font-mono text-text-secondary">
                                    <span className="w-2 h-2 rounded-full bg-blue-500 shadow-glow-blue"></span> Activos
                                </div>
                                <div className="flex items-center gap-2 text-xs font-mono text-text-secondary">
                                    <span className="w-2 h-2 rounded-full bg-green-500 shadow-glow-green"></span> Utilidad
                                </div>
                            </div>
                        </div>

                        <div className="h-[350px] w-full">
                            {chartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorActivos" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#00D8FF" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#00D8FF" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorUtilidad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#00F090" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#00F090" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} opacity={0.3} />
                                        <XAxis dataKey="period" stroke="#666" fontSize={11} tickLine={false} axisLine={false} dy={10} fontFamily="JetBrains Mono" />
                                        <YAxis stroke="#666" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `${(val / 1000000).toFixed(0)}M`} fontFamily="JetBrains Mono" />
                                        <RechartsTooltip
                                            contentStyle={{
                                                backgroundColor: 'rgba(5, 5, 5, 0.8)',
                                                borderColor: 'rgba(255, 255, 255, 0.1)',
                                                backdropFilter: 'blur(8px)',
                                                borderRadius: '8px',
                                                color: '#fff'
                                            }}
                                            itemStyle={{ fontSize: '12px', fontFamily: 'JetBrains Mono' }}
                                            formatter={(value: number) => formatNumber(value)}
                                        />
                                        <Area type="monotone" dataKey="Activos" stroke="#00D8FF" strokeWidth={2} fillOpacity={1} fill="url(#colorActivos)" />
                                        <Area type="monotone" dataKey="Utilidad" stroke="#00F090" strokeWidth={2} fillOpacity={1} fill="url(#colorUtilidad)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-text-tertiary">
                                    <ChartBarIcon className="w-12 h-12 opacity-20 mb-4" />
                                    <p className="font-mono text-sm">NO DATA SIGNAL</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* AI Insight Card (System Log Style) */}
                    <div className="bg-black border border-accent-primary/30 rounded-xl p-6 relative overflow-hidden shadow-glow-cyan">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <CpuChipIcon className="w-32 h-32 text-accent-primary animate-pulse" />
                        </div>
                        <div className="relative z-10">
                            <h3 className="text-sm font-bold text-accent-primary mb-3 flex items-center gap-2 font-mono uppercase tracking-widest">
                                <span className="w-2 h-2 bg-accent-primary rounded-full animate-ping" />
                                System Analysis Log
                            </h3>
                            <p className="text-gray-300 leading-relaxed text-sm font-mono border-l-2 border-accent-primary/50 pl-4 py-1">
                                {metrics?.metadata?.nota
                                    ? metrics.metadata.nota
                                    : `> INITIATING SEQUENCE...\n> ANALYZING ${issuer.documents?.length || 0} DOCUMENTS.\n> STATUS: ${issuer.name} presenta indicadores estables. Verifique reporte de riesgos.`}
                            </p>
                            <div className="mt-4 flex gap-2">
                                <span className="text-[10px] bg-accent-primary/10 px-2 py-1 rounded text-accent-primary font-mono border border-accent-primary/20">
                                    MODEL: GEMINI-PRO
                                </span>
                                <span className="text-[10px] bg-accent-primary/10 px-2 py-1 rounded text-accent-primary font-mono border border-accent-primary/20">
                                    LATENCY: 45ms
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Data Vault (1/3) */}
                <div className="glass-panel flex flex-col h-full max-h-[800px] overflow-hidden">
                    <div className="p-4 border-b border-white/5 bg-white/5 flex justify-between items-center">
                        <h3 className="font-semibold text-white flex items-center gap-2 font-mono text-sm uppercase tracking-wider">
                            <DocumentTextIcon className="w-4 h-4 text-accent-primary" />
                            Data Vault
                        </h3>
                        <span className="text-xs bg-black/50 border border-white/10 px-2 py-0.5 rounded text-text-secondary font-mono">
                            {issuer.documents?.length || 0} FILES
                        </span>
                    </div>

                    <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                        <div className="flex flex-col">
                            {issuer.documents && issuer.documents.length > 0 ? (
                                issuer.documents.map((doc, idx) => (
                                    <DocumentRow key={idx} doc={doc} />
                                ))
                            ) : (
                                <div className="text-center py-10 text-text-tertiary">
                                    <DocumentTextIcon className="w-12 h-12 mx-auto mb-2 opacity-10" />
                                    <p className="text-xs font-mono uppercase">Vault Empty</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default IssuerDetailView;
