import React, { useState, useEffect } from 'react';
import type { Issuer } from '../types';
import { ArrowTrendingUpIcon, BanknotesIcon, BuildingLibraryIcon } from '@heroicons/react/24/outline';
import { fetchIssuerHistory, fetchMetricsComparison } from '../utils/marketDataApi';
import { formatCurrency, formatPercentage } from '../utils/formatters';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface FinancialDashboardProps {
    issuers: Issuer[];
}

const FinancialDashboard: React.FC<FinancialDashboardProps> = ({ issuers }) => {
    const [historyData, setHistoryData] = useState<any[]>([]);
    const [stats, setStats] = useState({ totalAssets: 0, totalIncome: 0, avgRoe: 0 });
    const [loading, setLoading] = useState(false);
    const [selectedIssuer, setSelectedIssuer] = useState<string | null>(null);

    // Filter active issuers
    const activeIssuers = issuers.filter(i => i.sector === 'Privado' || i.sector === 'Público');

    useEffect(() => {
        if (activeIssuers.length > 0 && !selectedIssuer) {
            setSelectedIssuer(activeIssuers[0].id);
        }
    }, [activeIssuers, selectedIssuer]);

    // Fetch Market Aggregate Stats
    useEffect(() => {
        const loadMarketStats = async () => {
            if (activeIssuers.length === 0) return;
            const ids = activeIssuers.map(i => i.id);
            try {
                const comparison = await fetchMetricsComparison(ids);
                let assets = 0;
                let income = 0;
                let roeSum = 0;
                let count = 0;

                comparison.forEach((item: any) => {
                    if (item.metrics?.capital?.activosTotales) assets += item.metrics.capital.activosTotales;
                    if (item.metrics?.rentabilidad?.utilidadNeta) income += item.metrics.rentabilidad.utilidadNeta;
                    if (item.metrics?.rentabilidad?.roe) {
                        roeSum += item.metrics.rentabilidad.roe;
                        count++;
                    }
                });

                setStats({
                    totalAssets: assets,
                    totalIncome: income,
                    avgRoe: count > 0 ? roeSum / count : 0
                });
            } catch (e) {
                console.error("Dashboard stats error:", e);
            }
        };
        loadMarketStats();
    }, [issuers]); // Re-run when issuers list changes

    // Fetch History for Selected
    useEffect(() => {
        if (selectedIssuer) {
            setLoading(true);
            fetchIssuerHistory(selectedIssuer)
                .then(data => {
                    const formattedDetails = data
                        .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
                        .map((item: any) => ({
                            period: item.period,
                            value: item.activosTotales || item.ingresosTotales || 0,
                            label: 'Activos Totales'
                        }));
                    setHistoryData(formattedDetails);
                })
                .catch(err => console.error("Failed to load history", err))
                .finally(() => setLoading(false));
        }
    }, [selectedIssuer]);

    return (
        <div className="flex flex-col gap-6 animate-fade-in">
            {/* --- Market Pulse Ticker --- */}
            <div className="bg-bg-tertiary border-y border-border-subtle py-2 overflow-hidden whitespace-nowrap mask-linear-fade">
                <div className="inline-flex animate-marquee gap-12 text-sm font-mono text-text-secondary">
                    <span className="flex items-center gap-2">
                        <span className="text-accent-primary">●</span> MARKET CAP: {formatCurrency(stats.totalAssets)}
                    </span>
                    <span className="flex items-center gap-2">
                        <span className="text-status-success">▲</span> UT. NETA TOTAL: {formatCurrency(stats.totalIncome)}
                    </span>
                    <span className="flex items-center gap-2">
                        <span className="text-blue-400">♦</span> PROM. ROE: {formatPercentage(stats.avgRoe)}
                    </span>
                    <span className="flex items-center gap-2">
                        <span className="text-purple-400">■</span> EMISORES ACTIVOS: {activeIssuers.length}
                    </span>
                    {/* Duplicate for seamless loop */}
                    <span className="flex items-center gap-2">
                        <span className="text-accent-primary">●</span> MARKET CAP: {formatCurrency(stats.totalAssets)}
                    </span>
                </div>
            </div>

            {/* Welcome Section */}
            <div>
                <h1 className="text-2xl font-bold text-text-primary mb-1">Terminal de Mercado 👋</h1>
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                    <span className="w-2 h-2 rounded-full bg-status-success"></span>
                    <span>Sistema En Línea • {issuers.length} Emisores Indexados</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Financial Comparison Chart (2/3) */}
                <div className="lg:col-span-2 bg-bg-secondary border border-border-subtle rounded-xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                            <ArrowTrendingUpIcon className="w-5 h-5 text-accent-primary" />
                            Evolución de Activos
                        </h2>
                        {selectedIssuer && (
                            <span className="text-xs text-text-secondary bg-bg-tertiary px-2 py-1 rounded border border-border-subtle">
                                {activeIssuers.find(i => i.id === selectedIssuer)?.name}
                            </span>
                        )}
                    </div>

                    <div className="h-[300px] w-full relative">
                        {loading ? (
                            <div className="absolute inset-0 flex items-center justify-center text-text-secondary">
                                Cargando datos...
                            </div>
                        ) : historyData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={historyData}>
                                    <defs>
                                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} opacity={0.1} />
                                    <XAxis dataKey="period" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px', color: '#f3f4f6' }}
                                        itemStyle={{ color: '#c4b5fd' }}
                                        formatter={(value: number) => [formatCurrency(value, 'NIO'), 'Activos']}
                                    />
                                    <Area type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 opacity-50">
                                <BuildingLibraryIcon className="w-10 h-10 mb-2" />
                                <p className="text-text-secondary font-medium">Seleccione un emisor para ver su historia</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Market Leaders (1/3) */}
                <div className="bg-bg-secondary border border-border-subtle rounded-xl p-6 shadow-sm flex flex-col">
                    <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                        <BanknotesIcon className="w-5 h-5 text-status-success" />
                        Líderes de Mercado
                    </h2>
                    <div className="space-y-4">
                        {/* Static "Movers" for now until we have real sorted metrics */}
                        <div className="p-3 bg-bg-tertiary rounded-lg border border-border-subtle">
                            <p className="text-xs text-text-tertiary mb-1">MAYOR ACTIVO</p>
                            <div className="flex justify-between items-center">
                                <span className="font-bold text-text-primary">Mercado Total</span>
                                <span className="text-accent-primary font-mono">{formatCurrency(stats.totalAssets)}</span>
                            </div>
                        </div>
                        <div className="p-3 bg-bg-tertiary rounded-lg border border-border-subtle">
                            <p className="text-xs text-text-tertiary mb-1">MEJOR ROE</p>
                            <div className="flex justify-between items-center">
                                <span className="font-bold text-text-primary">Promedio</span>
                                <span className="text-green-400 font-mono">{formatPercentage(stats.avgRoe)}</span>
                            </div>
                        </div>
                        <div className="p-3 bg-bg-tertiary rounded-lg border border-border-subtle">
                            <p className="text-xs text-text-tertiary mb-1">MÁS DOCUMENTADO</p>
                            <div className="flex justify-between items-center">
                                <span className="font-bold text-text-primary">Total Docs</span>
                                <span className="text-blue-400 font-mono">{activeIssuers.reduce((acc, i) => acc + (i.documents?.length || 0), 0)} docs</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Active Issuers Selector Grid */}
            <div className="bg-bg-secondary border border-border-subtle rounded-xl p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-text-primary mb-4">Selector Rápido</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                    {activeIssuers.map(issuer => (
                        <button
                            key={issuer.id}
                            onClick={() => setSelectedIssuer(issuer.id)}
                            className={`p-3 rounded-lg border text-left transition-all ${selectedIssuer === issuer.id
                                ? 'bg-accent-primary/10 border-accent-primary text-accent-primary ring-1 ring-accent-primary'
                                : 'bg-bg-tertiary border-border-subtle text-text-secondary hover:bg-bg-elevated'
                                }`}
                        >
                            <div className="font-bold text-xs mb-1">{issuer.acronym}</div>
                            <div className="text-[10px] opacity-70 truncate">{issuer.name}</div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default FinancialDashboard;
