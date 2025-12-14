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
    <div className="bg-bg-secondary border border-border-subtle p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
        <div className={`absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity text-${color}-500`}>
            <Icon className="w-16 h-16" />
        </div>
        <div className="relative z-10">
            <p className="text-text-secondary text-xs uppercase font-semibold tracking-wider mb-1">{label}</p>
            <h3 className="text-2xl font-bold text-text-primary">{value}</h3>
            {subValue && (
                <div className="flex items-center gap-1 mt-2">
                    {trend === 'up' ? (
                        <ArrowTrendingUpIcon className="w-4 h-4 text-status-success" />
                    ) : trend === 'down' ? (
                        <ArrowTrendingDownIcon className="w-4 h-4 text-status-danger" />
                    ) : null}
                    <p className={`text-xs ${trend === 'up' ? 'text-status-success' : trend === 'down' ? 'text-status-danger' : 'text-text-tertiary'}`}>
                        {subValue}
                    </p>
                </div>
            )}
        </div>
    </div>
);

const DocumentRow = ({ doc }: { doc: Document }) => {
    // Determine type/color based on keywords
    let type = 'OTRO';
    let typeColor = 'text-text-tertiary border-text-tertiary/30';

    const lowerTitle = (doc.title || '').toLowerCase();
    if (lowerTitle.includes('financiero') || lowerTitle.includes('auditado')) {
        type = 'FINANCIERO';
        typeColor = 'text-blue-400 border-blue-400/30 bg-blue-400/10';
    } else if (lowerTitle.includes('calificaci') || lowerTitle.includes('riesgo')) {
        type = 'RIESGO';
        typeColor = 'text-purple-400 border-purple-400/30 bg-purple-400/10';
    } else if (lowerTitle.includes('hecho') || lowerTitle.includes('relevante')) {
        type = 'HECHO RELEVANTE';
        typeColor = 'text-amber-400 border-amber-400/30 bg-amber-400/10';
    } else if (lowerTitle.includes('prospecto')) {
        type = 'LEGAL';
        typeColor = 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10';
    }

    return (
        <a
            href={doc.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center justify-between p-3 bg-bg-tertiary/30 hover:bg-bg-elevated border border-border-subtle rounded-lg transition-all duration-200"
        >
            <div className="flex items-center gap-3 overflow-hidden">
                <div className={`p-2 rounded-lg ${typeColor}`}>
                    <DocumentTextIcon className="w-5 h-5 opacity-80" />
                </div>
                <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary group-hover:text-accent-primary truncate transition-colors">
                        {doc.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border border-opacity-30 font-semibold ${typeColor}`}>
                            {type}
                        </span>
                        <span className="text-xs text-text-tertiary">• {formatDate(doc.date)}</span>
                    </div>
                </div>
            </div>
            <ArrowTrendingUpIcon className="w-4 h-4 text-text-tertiary opacity-0 group-hover:opacity-100 -rotate-45 transition-all" />
        </a>
    );
};

// --- Main View ---

const IssuerDetailView: React.FC<IssuerDetailViewProps> = ({ issuer, onBack }) => {
    const [metrics, setMetrics] = useState<IssuerMetrics | null>(null);
    const [history, setHistory] = useState<HistoricalPoint[]>([]);
    const [, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'financials' | 'documents'>('financials');

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

    return (
        <div className="flex flex-col h-full animate-fade-in gap-6">
            {/* --- Top Bar: Navigation & Identity --- */}
            <div className="flex items-center justify-between">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-text-secondary hover:text-accent-primary transition-colors px-3 py-2 rounded-lg hover:bg-bg-tertiary"
                >
                    <ArrowLeftIcon className="w-4 h-4" />
                    <span className="text-sm font-medium">Volver al Mercado</span>
                </button>
                <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-text-tertiary">ID: {issuer.id.toUpperCase()}</span>
                    <span className={`px-2 py-0.5 text-xs font-bold rounded border ${issuer.sector === 'Público'
                        ? 'bg-blue-900/20 text-blue-400 border-blue-800/50'
                        : 'bg-emerald-900/20 text-emerald-400 border-emerald-800/50'
                        }`}>
                        {issuer.sector?.toUpperCase() || 'CORP'}
                    </span>
                </div>
            </div>

            {/* --- Header Profile --- */}
            <div className="flex items-start gap-6 bg-bg-secondary border border-border-subtle p-6 rounded-xl shadow-sm">
                <div className="w-20 h-20 bg-white rounded-lg p-3 shadow-inner flex-shrink-0 flex items-center justify-center">
                    <img
                        src={issuer.logoUrl || FALLBACK_LOGO_URL}
                        alt={issuer.name}
                        className="max-w-full max-h-full object-contain"
                        onError={(e) => { e.currentTarget.src = FALLBACK_LOGO_URL; }}
                    />
                </div>
                <div className="flex-1">
                    <h1 className="text-3xl font-bold text-text-primary tracking-tight">{issuer.name}</h1>
                    <div className="flex items-center gap-4 mt-2">
                        {issuer.acronym && (
                            <span className="text-lg font-mono text-accent-primary font-semibold tracking-wide">
                                {issuer.acronym}
                            </span>
                        )}
                        {metrics?.calificacion?.rating && (
                            <div className="flex items-center gap-1.5 bg-bg-tertiary px-3 py-1 rounded-md border border-border-subtle">
                                <span className="text-xs text-text-secondary uppercase">Rating</span>
                                <span className="text-sm font-bold text-text-primary">{metrics.calificacion.rating}</span>
                                {metrics.calificacion.perspectiva && (
                                    <span className={`text-xs font-medium ${metrics.calificacion.perspectiva.includes('Estable') ? 'text-blue-400' :
                                        metrics.calificacion.perspectiva.includes('Positiva') ? 'text-green-400' : 'text-text-tertiary'
                                        }`}>
                                        ({metrics.calificacion.perspectiva})
                                    </span>
                                )}
                            </div>
                        )}
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[500px]">

                {/* Left Column: Visuals & Intelligence (2/3) */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                    {/* Tabs / Controls */}
                    <div className="flex border-b border-border-subtle">
                        <button
                            onClick={() => setActiveTab('financials')}
                            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'financials' ? 'border-accent-primary text-accent-primary' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
                        >
                            Análisis Financiero
                        </button>
                    </div>

                    {/* Chart Section */}
                    <div className="bg-bg-secondary border border-border-subtle rounded-xl p-6 shadow-sm min-h-[400px]">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-semibold text-text-primary">Evolución Histórica</h3>
                            <div className="flex gap-2">
                                <span className="flex items-center gap-1 text-xs text-text-secondary">
                                    <span className="w-3 h-3 rounded-full bg-blue-500"></span> Activos
                                </span>
                                <span className="flex items-center gap-1 text-xs text-text-secondary">
                                    <span className="w-3 h-3 rounded-full bg-green-500"></span> Utilidad
                                </span>
                            </div>
                        </div>

                        <div className="h-[320px] w-full">
                            {chartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorActivos" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorUtilidad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} opacity={0.1} />
                                        <XAxis dataKey="period" stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                                        <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `${(val / 1000000).toFixed(0)}M`} />
                                        <RechartsTooltip
                                            contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                            itemStyle={{ fontSize: '12px' }}
                                            formatter={(value: number) => formatNumber(value)}
                                        />
                                        <Area type="monotone" dataKey="Activos" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorActivos)" />
                                        <Area type="monotone" dataKey="Utilidad" stroke="#22c55e" strokeWidth={2} fillOpacity={1} fill="url(#colorUtilidad)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-text-tertiary border border-dashed border-border-subtle rounded-lg bg-bg-tertiary/10">
                                    <ChartBarIcon className="w-8 h-8 opacity-50 mb-2" />
                                    <p>No hay datos históricos suficientes para graficar</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* AI Insight Card */}
                    <div className="bg-gradient-to-br from-bg-secondary to-bg-tertiary border border-border-subtle rounded-xl p-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5">
                            <CpuChipIcon className="w-32 h-32" />
                        </div>
                        <div className="relative z-10">
                            <h3 className="text-lg font-semibold text-accent-primary mb-2 flex items-center gap-2">
                                <CpuChipIcon className="w-5 h-5" />
                                NicaBloomberg AI Insight
                            </h3>
                            <p className="text-text-secondary leading-relaxed text-sm">
                                {metrics?.metadata?.nota
                                    ? metrics.metadata.nota
                                    : `Analizando ${issuer.documents?.length || 0} documentos procesados. ${issuer.name} presenta indicadores financieros consistentes en el sector ${issuer.sector}. Se recomienda revisar los Reportes de Calificación de Riesgo más recientes para un detalle cualitativo.`}
                            </p>
                            <div className="mt-4 flex gap-2">
                                <span className="text-[10px] bg-bg-primary px-2 py-1 rounded border border-border-subtle text-text-tertiary font-mono">
                                    MODEL: GEMINI-PRO-1.5
                                </span>
                                <span className="text-[10px] bg-bg-primary px-2 py-1 rounded border border-border-subtle text-text-tertiary font-mono">
                                    SOURCE: {metrics?.metadata?.fuente || 'VECTOR DB'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Data Vault (1/3) */}
                <div className="bg-bg-secondary border border-border-subtle rounded-xl shadow-sm flex flex-col h-full max-h-[800px]">
                    <div className="p-4 border-b border-border-subtle flex justify-between items-center sticky top-0 bg-bg-secondary z-10 rounded-t-xl">
                        <h3 className="font-semibold text-text-primary flex items-center gap-2">
                            <BuildingLibraryIcon className="w-4 h-4 text-text-tertiary" />
                            Data Vault
                        </h3>
                        <span className="text-xs bg-bg-tertiary px-2 py-0.5 rounded-full text-text-secondary">
                            {issuer.documents?.length || 0} files
                        </span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
                        {issuer.documents && issuer.documents.length > 0 ? (
                            issuer.documents.map((doc, idx) => (
                                <DocumentRow key={idx} doc={doc} />
                            ))
                        ) : (
                            <div className="text-center py-10 text-text-tertiary">
                                <DocumentTextIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                <p className="text-sm">Bolsa vacía.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default IssuerDetailView;
