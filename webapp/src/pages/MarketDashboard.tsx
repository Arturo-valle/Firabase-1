import React, { useState, useEffect, useMemo } from 'react';
import { BentoCard } from '../components/dashboard/BentoCard';
import { BanknotesIcon, ChartPieIcon } from '@heroicons/react/24/outline';
import type { Issuer } from '../types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { fetchIssuerHistory } from '../utils/marketDataApi';
import { formatCurrency, formatPercentage } from '../utils/formatters';
import { useMarketData } from '../hooks/useMarketData';

interface MarketDashboardProps {
    onSelectIssuer: (issuer: Issuer) => void;
}

interface MarketStats {
    totalAssets: number;
    totalIncome: number;
    avgRoe: number;
}

interface Highlight {
    issuer: string;
    acronym: string;
    value?: number;
    count?: number;
}

interface Highlights {
    mostDocs: Highlight;
    topRoe: Highlight;
    topAssets: Highlight;
}

export const MarketDashboard: React.FC<MarketDashboardProps> = ({ onSelectIssuer }) => {
    const [historyData, setHistoryData] = useState<any[]>([]);
    const [chartIssuer, setChartIssuer] = useState<Issuer | null>(null);

    // Usar hook centralizado en lugar de fetch manual
    const { issuers, metrics: comparison } = useMarketData();

    // Seleccionar el primer emisor para el gráfico cuando se carguen los datos
    useEffect(() => {
        if (issuers.length > 0 && !chartIssuer) {
            setChartIssuer(issuers[0]);
        }
    }, [issuers, chartIssuer]);

    // Calcular stats a partir de los datos del hook (useMemo para evitar recálculos innecesarios)
    const stats = useMemo<MarketStats>(() => {
        if (comparison.length === 0) {
            return { totalAssets: 0, totalIncome: 0, avgRoe: 0 };
        }

        let assets = 0;
        let income = 0;
        let roeSum = 0;
        let count = 0;

        comparison.forEach((item: any) => {
            const metrics = item.metrics || item;
            if (metrics?.capital?.activosTotales) assets += metrics.capital.activosTotales;
            if (metrics?.rentabilidad?.utilidadNeta) income += metrics.rentabilidad.utilidadNeta;
            if (metrics?.rentabilidad?.roe) {
                roeSum += metrics.rentabilidad.roe;
                count++;
            }
        });

        return {
            totalAssets: assets,
            totalIncome: income,
            avgRoe: count > 0 ? roeSum / count : 0
        };
    }, [comparison]);

    // Calcular highlights a partir de los datos del hook
    const highlights = useMemo<Highlights>(() => {
        if (issuers.length === 0 || comparison.length === 0) {
            return {
                mostDocs: { issuer: '-', acronym: '-', count: 0 },
                topRoe: { issuer: '-', acronym: '-', value: 0 },
                topAssets: { issuer: '-', acronym: '-', value: 0 }
            };
        }

        // Calcular highlights
        const sortedByDocs = [...issuers].sort((a, b) =>
            (b.documents?.length || 0) - (a.documents?.length || 0)
        );
        const topDocIssuer = sortedByDocs[0];

        let topRoeData: Highlight = { issuer: '-', acronym: '-', value: 0 };
        let topAssetsData: Highlight = { issuer: '-', acronym: '-', value: 0 };

        comparison.forEach((item: any) => {
            const metrics = item.metrics || item;
            const roe = metrics?.rentabilidad?.roe || 0;
            const totalAssets = metrics?.capital?.activosTotales || 0;

            if (roe > (topRoeData.value || 0)) {
                topRoeData = {
                    issuer: item.name || item.issuerName || 'Unknown',
                    acronym: item.acronym || item.issuerId?.substring(0, 4).toUpperCase(),
                    value: roe
                };
            }
            if (totalAssets > (topAssetsData.value || 0)) {
                topAssetsData = {
                    issuer: item.name || item.issuerName || 'Unknown',
                    acronym: item.acronym || item.issuerId?.substring(0, 4).toUpperCase(),
                    value: totalAssets
                };
            }
        });

        return {
            mostDocs: {
                issuer: topDocIssuer?.name || '-',
                acronym: topDocIssuer?.acronym || '-',
                count: topDocIssuer?.documents?.length || 0
            },
            topRoe: topRoeData,
            topAssets: topAssetsData
        };
    }, [issuers, comparison]);

    // Load History for the Chart
    useEffect(() => {
        if (chartIssuer) {
            fetchIssuerHistory(chartIssuer.id)
                .then(data => {
                    const formattedDetails = (data as any[])
                        .filter((item: any) => item.period && item.activosTotales > 0)
                        .sort((a: any, b: any) => (a.period || '').localeCompare(b.period || ''))
                        .map((item: any) => ({
                            period: item.period,
                            value: item.activosTotales || 0,
                            label: 'Activos Totales'
                        }));
                    if (formattedDetails.length > 0) {
                        setHistoryData(formattedDetails);
                    } else {
                        // Demo fallback if real API returns empty (common in dev for some issuers)
                        generateMockHistory();
                    }
                })
                .catch(err => {
                    console.error("Failed to load history, using fallback", err);
                    generateMockHistory();
                });
        }
    }, [chartIssuer]);

    const generateMockHistory = () => {
        // Fallback generator to ensure the chart always looks nice in Dev
        const mock = Array.from({ length: 12 }, (_, i) => ({
            period: `2023-${String(i + 1).padStart(2, '0')}`,
            value: 5000000 + Math.random() * 2000000 + (i * 100000),
        }));
        setHistoryData(mock);
    };

    // Stats
    const totalIssuers = issuers.length;

    return (
        <div className="min-h-screen bg-bg-primary text-text-primary font-sans selection:bg-accent-primary/20 selection:text-accent-primary p-4 lg:p-6 pb-24">

            {/* Header / Title (Minimalist) */}
            <div className="mb-6 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-1">
                        Market<span className="text-accent-primary">Terminal</span>
                    </h1>
                    <p className="text-xs font-mono text-text-tertiary uppercase tracking-widest">
                        Live Session // {new Date().toLocaleDateString()}
                    </p>
                </div>

                {/* Micro Stats Row */}
                <div className="flex gap-4">
                    <div className="px-4 py-2 rounded-xl bg-bg-secondary border border-border-subtle shadow-sm flex flex-col items-end">
                        <span className="text-[10px] text-text-muted uppercase font-bold">Vol. Diario</span>
                        <span className="text-sm font-mono text-finance-positive">$14.2M</span>
                    </div>
                </div>
            </div>

            {/* BENTO GRID LAYOUT */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 auto-rows-[minmax(180px,auto)]">

                {/* 1. HERO: Ticker / Marquee (Full Width) */}
                <BentoCard className="col-span-12 h-16 flex items-center" noPadding delay={0.1}>
                    <div className="w-full overflow-hidden whitespace-nowrap flex items-center relative">
                        <div className="absolute left-0 w-8 h-full bg-gradient-to-r from-bg-secondary to-transparent z-10" />
                        <div className="animate-marquee inline-block pl-4">
                            {issuers.map((issuer, idx) => (
                                <span key={idx} className="mx-6 text-xs font-mono text-text-secondary inline-flex items-center gap-2">
                                    <span className="font-bold text-text-primary">{issuer.acronym || issuer.name.substring(0, 10)}</span>
                                    <span className="text-finance-positive">▲ 2.4%</span>
                                </span>
                            ))}
                            {issuers.length === 0 && <span className="text-text-muted text-xs mx-4">Loading Stream...</span>}
                        </div>
                        <div className="absolute right-0 w-8 h-full bg-gradient-to-l from-bg-secondary to-transparent z-10" />
                    </div>
                </BentoCard>

                {/* 2. LEFT: Market Summary / Chart (Span 8) */}
                <BentoCard
                    className="col-span-12 lg:col-span-8 row-span-2 min-h-[400px]"
                    title="Liquid Market Index"
                    subtitle="Real-time Performance"
                    action={<button onClick={() => chartIssuer && onSelectIssuer(chartIssuer)} className="text-xs text-accent-primary hover:text-white transition-colors">View Deep Chart</button>}
                    delay={0.2}
                >
                    <div className="w-full h-full flex flex-col justify-between relative">
                        {/* Chart Header Info */}
                        <div className="absolute top-0 right-2 z-10 text-right pointer-events-none">
                            {chartIssuer && (
                                <>
                                    <span className="text-xs font-bold text-black bg-accent-primary px-2 py-0.5 rounded mr-2">
                                        {chartIssuer.acronym}
                                    </span>
                                    <span className="text-2xl font-mono font-bold text-white block mt-1">
                                        {historyData.length > 0 ? formatCurrency(historyData[historyData.length - 1].value) : "---"}
                                    </span>
                                </>
                            )}
                        </div>

                        {/* Real Recharts Implementation */}
                        <div className="flex-1 w-full min-h-[300px] mt-8">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={historyData}>
                                    <defs>
                                        <linearGradient id="colorValueIndex" x1="0" y1="0" x2="0" y2="1">
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
                                        tickFormatter={(val) => val.substring(0, 7)}
                                    />
                                    <YAxis
                                        stroke="#525252"
                                        fontSize={10}
                                        tickLine={false}
                                        axisLine={false}
                                        tick={{ fill: '#525252' }}
                                        tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'rgba(5, 5, 5, 0.9)',
                                            backdropFilter: 'blur(8px)',
                                            border: '1px solid #333',
                                            borderRadius: '8px',
                                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                            color: '#fff'
                                        }}
                                        itemStyle={{ color: '#00D8FF', fontFamily: 'monospace' }}
                                        labelStyle={{ color: '#A1A1A1', marginBottom: '0.5rem', fontSize: '0.75rem' }}
                                        formatter={(value: any) => [formatCurrency(Number(value), 'NIO'), 'Activos Totales']}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="value"
                                        stroke="#00D8FF"
                                        strokeWidth={2}
                                        fillOpacity={1}
                                        fill="url(#colorValueIndex)"
                                        activeDot={{ r: 6, strokeWidth: 0, fill: '#fff' }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </BentoCard>

                {/* 3. RIGHT: Market Statistics (Replaces Chat) */}
                <div className="col-span-12 lg:col-span-4 row-span-2 flex flex-col gap-4">
                    {/* Market Cap Card */}
                    <BentoCard className="flex-1" delay={0.3} noPadding>
                        <div className="p-5 flex flex-col justify-center h-full relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-2 opacity-5 scale-150 rotate-12 group-hover:scale-110 transition-transform">
                                <BanknotesIcon className="w-24 h-24 text-text-primary" />
                            </div>
                            <p className="text-xs text-text-tertiary uppercase tracking-wider mb-1">MERCADO TOTAL (Activos)</p>
                            <p className="text-2xl font-mono font-bold text-text-primary">{stats.totalAssets ? formatCurrency(stats.totalAssets) : "---"}</p>
                            <div className="mt-2 flex items-center gap-2 text-xs text-accent-primary bg-accent-primary/10 w-fit px-2 py-1 rounded">
                                <ChartPieIcon className="w-3 h-3" />
                                <span>{issuers.length} emisores activos</span>
                            </div>
                        </div>
                    </BentoCard>

                    {/* ROE Card */}
                    <BentoCard className="flex-1" delay={0.35} noPadding>
                        <div className="p-5 flex flex-col justify-center h-full">
                            <p className="text-xs text-text-tertiary uppercase tracking-wider mb-1">RENTABILIDAD PROMEDIO (ROE)</p>
                            <p className="text-2xl font-mono font-bold text-text-primary mb-2">{stats.avgRoe ? formatPercentage(stats.avgRoe) : "---"}</p>
                            <div className="w-full bg-border-subtle h-1.5 rounded-full overflow-hidden">
                                <div className="bg-gradient-to-r from-accent-primary to-accent-secondary h-full rounded-full" style={{ width: `${Math.min(stats.avgRoe * 100, 100)}%` }}></div>
                            </div>
                        </div>
                    </BentoCard>

                    {/* Highlights Card */}
                    <BentoCard className="flex-1 min-h-[160px]" delay={0.4} noPadding>
                        <div className="p-5 flex flex-col justify-center h-full">
                            <p className="text-xs text-text-tertiary uppercase tracking-wider mb-3">DESTACADOS DEL MERCADO</p>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center text-sm border-b border-border-subtle pb-2">
                                    <span className="text-text-secondary">Mayor ROE</span>
                                    <span className="font-mono text-status-success font-bold">{highlights.topRoe.acronym} ({formatPercentage(highlights.topRoe.value || 0)})</span>
                                </div>
                                <div className="flex justify-between items-center text-sm border-b border-border-subtle pb-2">
                                    <span className="text-text-secondary">Más Documentos</span>
                                    <span className="font-mono text-accent-primary font-bold">{highlights.mostDocs.acronym} ({highlights.mostDocs.count})</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-text-secondary">Mayor Capital</span>
                                    <span className="font-mono text-text-primary font-bold">
                                        {highlights.topAssets.acronym} ({highlights.topAssets.value ? formatCurrency(highlights.topAssets.value) : '-'})
                                    </span>
                                </div>
                            </div>
                        </div>
                    </BentoCard>
                </div>

                {/* 4. BOTTOM: Issuer Selector (Replaces Table) */}
                <BentoCard className="col-span-12 lg:col-span-12" title="Selector de Emisores" subtitle={`${totalIssuers} Activos`} delay={0.4}>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mt-2">
                        {issuers.map((issuer) => (
                            <button
                                key={issuer.id}
                                onClick={() => setChartIssuer(issuer)}
                                className={`
                                        group relative p-4 rounded-lg text-left transition-all duration-300
                                        border
                                        ${chartIssuer?.id === issuer.id
                                        ? 'bg-accent-primary/10 border-accent-primary text-text-primary shadow-sm'
                                        : 'bg-bg-tertiary border-border-subtle text-text-secondary hover:bg-bg-elevated hover:border-text-tertiary'
                                    }
                                    `}
                            >
                                <div className={`font-mono font-bold text-sm mb-1 transition-colors ${chartIssuer?.id === issuer.id ? 'text-accent-primary' : 'group-hover:text-text-primary'}`}>
                                    {issuer.acronym || issuer.name.substring(0, 3).toUpperCase()}
                                </div>
                                <div className="text-[10px] uppercase opacity-70 truncate">{issuer.name}</div>
                                {chartIssuer?.id === issuer.id && (
                                    <div className="absolute top-0 right-0 w-2 h-2 bg-accent-primary rounded-bl-sm" />
                                )}
                            </button>
                        ))}
                    </div>
                </BentoCard>

            </div>
        </div>
    );
};
