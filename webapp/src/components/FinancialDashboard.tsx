import React, { useState, useEffect } from 'react';
import type { Issuer } from '../types';
import { ArrowTrendingUpIcon, BanknotesIcon, BuildingLibraryIcon, ClockIcon } from '@heroicons/react/24/outline';
import { fetchIssuerHistory, fetchMetricsComparison } from '../utils/marketDataApi';
import { formatCurrency, formatPercentage } from '../utils/formatters';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface FinancialDashboardProps {
    issuers: Issuer[];
}

const FinancialDashboard: React.FC<FinancialDashboardProps> = ({ issuers }) => {
    const [historyData, setHistoryData] = useState<any[]>([]);
    const [stats, setStats] = useState({ totalAssets: 0, totalIncome: 0, avgRoe: 0 });
    const [highlights, setHighlights] = useState({
        mostDocs: { issuer: '-', acronym: '-', count: 0 },
        topRoe: { issuer: '-', acronym: '-', value: 0 },
        topAssets: { issuer: '-', acronym: '-', value: 0 }
    });
    const [loading, setLoading] = useState(false);
    const [selectedIssuer, setSelectedIssuer] = useState<string | null>(null);

    // Filter active issuers
    // Use all provided issuers as they are already filtered for activity upstream
    const activeIssuers = issuers;

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

                // Calculate highlights from real data
                // 1. Find issuer with most documents
                const sortedByDocs = [...activeIssuers].sort((a, b) =>
                    (b.documents?.length || 0) - (a.documents?.length || 0)
                );
                const topDocIssuer = sortedByDocs[0];

                // 2. Find issuer with highest ROE
                let topRoeData = { issuer: '-', acronym: '-', value: 0 };
                let topAssetsData = { issuer: '-', acronym: '-', value: 0 };
                comparison.forEach((item: any) => {
                    const roe = item.metrics?.rentabilidad?.roe || 0;
                    const totalAssets = item.metrics?.capital?.activosTotales || 0;
                    if (roe > topRoeData.value) {
                        topRoeData = { issuer: item.name, acronym: item.acronym || item.issuerId?.substring(0, 4).toUpperCase(), value: roe };
                    }
                    if (totalAssets > topAssetsData.value) {
                        topAssetsData = { issuer: item.name, acronym: item.acronym || item.issuerId?.substring(0, 4).toUpperCase(), value: totalAssets };
                    }
                });

                setHighlights({
                    mostDocs: {
                        issuer: topDocIssuer?.name || '-',
                        acronym: topDocIssuer?.acronym || '-',
                        count: topDocIssuer?.documents?.length || 0
                    },
                    topRoe: topRoeData,
                    topAssets: topAssetsData
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
        <div className="flex flex-col gap-6 animate-fade-in pb-10">
            {/* --- Market Pulse Ticker (Real OLED Style) --- */}
            <div className="bg-black/80 border-y border-accent-primary/20 py-2 overflow-hidden whitespace-nowrap mask-linear-fade relative">
                <div className="absolute inset-0 bg-accent-primary/5"></div>
                <div className="inline-flex animate-marquee gap-16 text-xs font-mono tracking-widest text-text-secondary">
                    <span className="flex items-center gap-3">
                        <span className="w-2 h-2 rounded-full bg-accent-primary animate-pulse"></span>
                        MARKET CAP: <span className="text-white font-bold">{formatCurrency(stats.totalAssets)}</span>
                    </span>
                    <span className="flex items-center gap-3">
                        <span className="text-status-success">▲</span>
                        UT. NETA TOTAL: <span className="text-status-success font-bold">{formatCurrency(stats.totalIncome)}</span>
                    </span>
                    <span className="flex items-center gap-3">
                        <span className="text-accent-secondary">♦</span>
                        PROM. ROE: <span className="text-white font-bold">{formatPercentage(stats.avgRoe)}</span>
                    </span>
                    <span className="flex items-center gap-3">
                        <span className="text-accent-tertiary">■</span>
                        EMISORES: <span className="text-white font-bold">{activeIssuers.length}</span>
                    </span>

                    {/* Duplicate for seamless loop */}
                    <span className="flex items-center gap-3">
                        <span className="w-2 h-2 rounded-full bg-accent-primary animate-pulse"></span>
                        MARKET CAP: <span className="text-white font-bold">{formatCurrency(stats.totalAssets)}</span>
                    </span>
                    <span className="flex items-center gap-3">
                        <span className="text-status-success">▲</span>
                        UT. NETA TOTAL: <span className="text-status-success font-bold">{formatCurrency(stats.totalIncome)}</span>
                    </span>
                    <span className="flex items-center gap-3">
                        <span className="text-accent-secondary">♦</span>
                        PROM. ROE: <span className="text-white font-bold">{formatPercentage(stats.avgRoe)}</span>
                    </span>
                </div>
            </div>

            {/* Header */}
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">Terminal de Mercado</h1>
                    <div className="flex items-center gap-3 text-sm text-text-tertiary">
                        <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-status-success/10 text-status-success border border-status-success/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-status-success animate-pulse"></span>
                            SYSTEM ONLINE
                        </span>
                        <span>•</span>
                        <span className="font-mono text-text-secondary">{issuers.length} INDEXED ISSUERS</span>
                        <span>•</span>
                        <span className="flex items-center gap-1"><ClockIcon className="w-3 h-3" /> REALTIME</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Financial Comparison Chart (8/12) */}
                <div className="lg:col-span-8 glass-panel p-1 relative overflow-hidden group">
                    {/* Glow effect */}
                    <div className="absolute -inset-1 bg-gradient-to-r from-accent-primary/20 via-transparent to-accent-secondary/20 rounded-xl opacity-0 group-hover:opacity-100 blur transition duration-500"></div>
                    <div className="relative bg-bg-secondary h-full rounded-lg p-6 border border-white/5">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                    <ArrowTrendingUpIcon className="w-5 h-5 text-accent-primary" />
                                    EVOLUCIÓN DE ACTIVOS
                                </h2>
                                <p className="text-xs text-text-tertiary mt-1">SERIE HISTÓRICA AUDITADA</p>
                            </div>

                            {selectedIssuer && (
                                <div className="text-right">
                                    <span className="text-2xl font-mono font-bold text-white block">
                                        {historyData.length > 0 ? formatCurrency(historyData[historyData.length - 1].value) : "---"}
                                    </span>
                                    <div className="flex items-center justify-end gap-2">
                                        <span className="text-xs font-bold text-black bg-accent-primary px-2 py-0.5 rounded">
                                            {activeIssuers.find(i => i.id === selectedIssuer)?.acronym}
                                        </span>
                                        <span className="text-xs text-text-secondary">{activeIssuers.find(i => i.id === selectedIssuer)?.name}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="h-[350px] w-full relative">
                            {loading ? (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin"></div>
                                        <span className="text-xs text-accent-primary font-mono animate-pulse">FETCHING DATA STREAM...</span>
                                    </div>
                                </div>
                            ) : historyData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={historyData}>
                                        <defs>
                                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#00D8FF" stopOpacity={0.4} />
                                                <stop offset="95%" stopColor="#00D8FF" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                                        <XAxis
                                            dataKey="period"
                                            stroke="#525252"
                                            fontSize={10}
                                            tickLine={false}
                                            axisLine={false}
                                            tick={{ fill: '#525252' }}
                                            dy={10}
                                        />
                                        <YAxis
                                            stroke="#525252"
                                            fontSize={10}
                                            tickLine={false}
                                            axisLine={false}
                                            tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`}
                                            tick={{ fill: '#525252' }}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: 'rgba(5, 5, 5, 0.9)',
                                                backdropFilter: 'blur(8px)',
                                                border: '1px solid #333',
                                                borderRadius: '4px',
                                                boxShadow: '0 0 20px rgba(0,0,0,0.5)'
                                            }}
                                            itemStyle={{ color: '#00D8FF', fontFamily: 'monospace' }}
                                            labelStyle={{ color: '#A1A1A1', marginBottom: '0.5rem', fontSize: '0.75rem' }}
                                            formatter={(value: number) => [formatCurrency(value, 'NIO'), 'Activos Totales']}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="value"
                                            stroke="#00D8FF"
                                            strokeWidth={2}
                                            fillOpacity={1}
                                            fill="url(#colorValue)"
                                            activeDot={{ r: 6, strokeWidth: 0, fill: '#fff' }}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 opacity-30">
                                    <BuildingLibraryIcon className="w-16 h-16 text-text-tertiary mb-4" />
                                    <p className="text-text-secondary font-mono">SELECCIONE EMISOR PARA VISUALIZAR</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Market Leaders (4/12) */}
                <div className="lg:col-span-4 flex flex-col gap-4">
                    {/* Stats Cards */}
                    <div className="card bg-bg-tertiary border-border-subtle p-5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-2 opacity-10">
                            <BanknotesIcon className="w-24 h-24 text-white" />
                        </div>
                        <p className="text-xs text-text-tertiary uppercase tracking-wider mb-1">MERCADO TOTAL (Activos)</p>
                        <p className="text-2xl font-mono font-bold text-white text-gradient-cyan">{formatCurrency(stats.totalAssets)}</p>
                        <div className="mt-4 flex items-center gap-2 text-xs text-accent-primary bg-accent-primary/10 w-fit px-2 py-1 rounded">
                            <span>{activeIssuers.length} emisores activos</span>
                        </div>
                    </div>

                    <div className="card bg-bg-tertiary border-border-subtle p-5">
                        <p className="text-xs text-text-tertiary uppercase tracking-wider mb-1">RENTABILIDAD PROMEDIO (ROE)</p>
                        <p className="text-2xl font-mono font-bold text-white">{formatPercentage(stats.avgRoe)}</p>
                        <div className="w-full bg-gray-800 h-1.5 mt-4 rounded-full overflow-hidden">
                            <div className="bg-gradient-to-r from-accent-secondary to-green-400 h-full rounded-full" style={{ width: `${Math.min(stats.avgRoe * 100, 100)}%` }}></div>
                        </div>
                    </div>

                    <div className="card bg-bg-tertiary border-border-subtle p-5 flex-1">
                        <p className="text-xs text-text-tertiary uppercase tracking-wider mb-3">DESTACADOS</p>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2">
                                <span className="text-text-secondary">Mayor ROE</span>
                                <span className="font-mono text-status-success">{highlights.topRoe.acronym} ({formatPercentage(highlights.topRoe.value)})</span>
                            </div>
                            <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2">
                                <span className="text-text-secondary">Más Documentos</span>
                                <span className="font-mono text-accent-primary">{highlights.mostDocs.acronym} ({highlights.mostDocs.count})</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-text-secondary">Mayor Capital</span>
                                <span className="font-mono text-white">{highlights.topAssets.acronym}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Active Issuers Selector Grid */}
            <div className="glass-panel p-6 border-t-4 border-t-accent-primary/20">
                <h2 className="text-sm font-bold text-text-tertiary uppercase tracking-widest mb-6 flex items-center gap-2">
                    <span className="w-2 h-2 rounded bg-accent-primary"></span>
                    SELECTOR DE EMISORES
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                    {activeIssuers.map(issuer => (
                        <button
                            key={issuer.id}
                            onClick={() => setSelectedIssuer(issuer.id)}
                            className={`
                                group relative p-4 rounded-lg text-left transition-all duration-300
                                border
                                ${selectedIssuer === issuer.id
                                    ? 'bg-accent-primary/10 border-accent-primary text-white shadow-glow-cyan'
                                    : 'bg-bg-tertiary border-border-subtle text-text-secondary hover:bg-bg-elevated hover:border-text-tertiary'
                                }
                            `}
                        >
                            <div className="font-mono font-bold text-sm mb-1 group-hover:text-accent-primary transition-colors">{issuer.acronym}</div>
                            <div className="text-[10px] uppercase opacity-60 truncate">{issuer.name}</div>

                            {/* Active Corner */}
                            {selectedIssuer === issuer.id && (
                                <div className="absolute top-0 right-0 w-2 h-2 bg-accent-primary"></div>
                            )}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default FinancialDashboard;
