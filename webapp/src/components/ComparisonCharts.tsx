import React from 'react';
import {
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Radar,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';
import type { IssuerMetrics } from '../types';

interface ComparisonChartsProps {
    issuers: IssuerMetrics[];
}

const ComparisonCharts: React.FC<ComparisonChartsProps> = ({ issuers }) => {
    if (issuers.length === 0) return null;

    // "NicaBloomberg" Neon Palette
    const colors = ['#00F0FF', '#7000FF', '#FF003C', '#00FF94', '#FFE600'];

    // Prepare Radar Chart Data - 5 key dimensions
    const radarData = [
        {
            dimension: 'Liquidez',
            ...issuers.reduce((acc, issuer) => ({
                ...acc,
                [issuer.issuerName]: issuer.liquidez.ratioCirculante || 0
            }), {})
        },
        {
            dimension: 'Solvencia',
            ...issuers.reduce((acc, issuer) => ({
                ...acc,
                [issuer.issuerName]: issuer.solvencia.coberturIntereses ? Math.min(issuer.solvencia.coberturIntereses, 10) : 0
            }), {})
        },
        {
            dimension: 'Rentabilidad',
            ...issuers.reduce((acc, issuer) => ({
                ...acc,
                [issuer.issuerName]: issuer.rentabilidad.roe ? issuer.rentabilidad.roe / 2 : 0 // Normalize to 0-10 scale
            }), {})
        },
        {
            dimension: 'Eficiencia',
            ...issuers.reduce((acc, issuer) => ({
                ...acc,
                [issuer.issuerName]: issuer.eficiencia.rotacionActivos ? issuer.eficiencia.rotacionActivos * 2 : 0
            }), {})
        },
        {
            dimension: 'Capitalización',
            ...issuers.reduce((acc, issuer) => ({
                ...acc,
                // Normalize by largest value
                [issuer.issuerName]: issuer.capital.activosTotales ?
                    (issuer.capital.activosTotales / Math.max(...issuers.map(i => i.capital.activosTotales || 1))) * 10 : 0
            }), {})
        }
    ];

    // Prepare Bar Chart Data - ROE Comparison
    const roeData = issuers.map(issuer => ({
        name: issuer.issuerName.length > 15 ? issuer.issuerName.substring(0, 15) + '...' : issuer.issuerName,
        ROE: issuer.rentabilidad.roe || 0,
        ROA: issuer.rentabilidad.roa || 0,
    }));

    // Prepare Capital Structure Data
    const capitalData = issuers.map(issuer => ({
        name: issuer.issuerName.length > 15 ? issuer.issuerName.substring(0, 15) + '...' : issuer.issuerName,
        Activos: issuer.capital.activosTotales || 0,
        Patrimonio: issuer.capital.patrimonio || 0,
        Pasivos: issuer.capital.pasivos || 0,
    }));

    // Prepare Liquidity Comparison
    const liquidityData = issuers.map(issuer => ({
        name: issuer.issuerName.length > 15 ? issuer.issuerName.substring(0, 15) + '...' : issuer.issuerName,
        'Ratio Circulante': issuer.liquidez.ratioCirculante || 0,
        'Prueba Ácida': issuer.liquidez.pruebaAcida || 0,
    }));

    // Chart styling for dark theme
    const chartTheme = {
        gridColor: 'rgba(255, 255, 255, 0.1)', // Subtle white opacity
        textColor: '#94a3b8', // Slate 400
        tooltipBg: 'rgba(11, 14, 20, 0.95)', // Deep black/blue with blur (handled by CSS class)
        tooltipBorder: 'rgba(255, 255, 255, 0.1)',
        tooltipText: '#f1f5f9',
    };

    const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: any[]; label?: string }) => {
        if (active && payload && payload.length) {
            return (
                <div className="glass-panel p-3 rounded-lg border border-accent-primary/30 shadow-glow-sm">
                    <p className="text-white font-bold mb-2 font-mono text-xs uppercase tracking-wider border-b border-white/10 pb-1">{label}</p>
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex items-center gap-2 text-xs font-mono mb-1">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
                            <span className="text-text-secondary">{entry.name}:</span>
                            <span className="text-white font-bold">
                                {entry.value.toLocaleString('es-NI', { maximumFractionDigits: 2 })}
                            </span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Radar Chart - Overall Comparison */}
            <div className="glass-panel p-6 rounded-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-accent-primary/5 blur-[50px] rounded-full pointer-events-none" />
                <h3 className="text-sm font-bold text-text-tertiary uppercase tracking-wider mb-6 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-accent-primary"></span>
                    Radar de Desempeño Relativo
                </h3>
                <div className="h-[400px] w-full relative z-10">
                    <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                            <PolarGrid stroke={chartTheme.gridColor} />
                            <PolarAngleAxis dataKey="dimension" tick={{ fill: chartTheme.textColor, fontSize: 12, fontFamily: 'monospace' }} />
                            <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} />
                            {issuers.map((issuer, idx) => (
                                <Radar
                                    key={idx}
                                    name={issuer.issuerName}
                                    dataKey={issuer.issuerName}
                                    stroke={colors[idx % colors.length]}
                                    strokeWidth={2}
                                    fill={colors[idx % colors.length]}
                                    fillOpacity={0.1}
                                />
                            ))}
                            <Legend wrapperStyle={{ color: chartTheme.textColor, fontSize: '12px', fontFamily: 'monospace', paddingTop: '20px' }} />
                            <Tooltip content={<CustomTooltip />} />
                        </RadarChart>
                    </ResponsiveContainer>
                </div>
                <p className="text-[10px] text-center text-text-tertiary font-mono mt-2 opacity-50">
                    ESCALA NORMALIZADA (0-10) PARA COMPARACIÓN VISUAL
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* ROE/ROA Comparison */}
                <div className="glass-panel p-6 rounded-2xl">
                    <h3 className="text-sm font-bold text-text-tertiary uppercase tracking-wider mb-6 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-accent-secondary"></span>
                        Rentabilidad (Retorno %)
                    </h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={roeData}>
                                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridColor} vertical={false} />
                                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{ fill: chartTheme.textColor, fontSize: 10, fontFamily: 'monospace' }} interval={0} />
                                <YAxis tick={{ fill: chartTheme.textColor, fontSize: 10, fontFamily: 'monospace' }} />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                                <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }} />
                                <Bar dataKey="ROE" fill="#00ff94" name="ROE (%)" radius={[4, 4, 0, 0]} barSize={20} />
                                <Bar dataKey="ROA" fill="#00f0ff" name="ROA (%)" radius={[4, 4, 0, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Liquidity Comparison */}
                <div className="glass-panel p-6 rounded-2xl">
                    <h3 className="text-sm font-bold text-text-tertiary uppercase tracking-wider mb-6 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-accent-accent"></span>
                        Liquidez (Ratios)
                    </h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={liquidityData}>
                                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridColor} vertical={false} />
                                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{ fill: chartTheme.textColor, fontSize: 10, fontFamily: 'monospace' }} interval={0} />
                                <YAxis tick={{ fill: chartTheme.textColor, fontSize: 10, fontFamily: 'monospace' }} />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                                <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }} />
                                <Bar dataKey="Ratio Circulante" fill="#7000ff" radius={[4, 4, 0, 0]} barSize={20} />
                                <Bar dataKey="Prueba Ácida" fill="#ff003c" radius={[4, 4, 0, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Capital Structure Comparison */}
            <div className="glass-panel p-6 rounded-2xl">
                <h3 className="text-sm font-bold text-text-tertiary uppercase tracking-wider mb-6 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-white"></span>
                    Estructura de Capital (Millones C$)
                </h3>
                <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={capitalData}>
                            <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridColor} vertical={false} />
                            <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{ fill: chartTheme.textColor, fontSize: 10, fontFamily: 'monospace' }} interval={0} />
                            <YAxis tick={{ fill: chartTheme.textColor, fontSize: 10, fontFamily: 'monospace' }} tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                            <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }} />
                            <Bar dataKey="Activos" fill="#00F0FF" name="Activos" stackId="a" radius={[0, 0, 0, 0]} barSize={40} />
                            <Bar dataKey="Patrimonio" fill="#00FF94" name="Patrimonio" stackId="a" radius={[0, 0, 0, 0]} barSize={40} />
                            <Bar dataKey="Pasivos" fill="#FF003C" name="Pasivos" stackId="a" radius={[4, 4, 0, 0]} barSize={40} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default ComparisonCharts;
