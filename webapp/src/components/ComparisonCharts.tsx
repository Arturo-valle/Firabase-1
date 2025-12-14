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

    // Color palette for different issuers
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];

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
        name: issuer.issuerName.length > 20 ? issuer.issuerName.substring(0, 20) + '...' : issuer.issuerName,
        ROE: issuer.rentabilidad.roe || 0,
        ROA: issuer.rentabilidad.roa || 0,
    }));

    // Prepare Capital Structure Data
    const capitalData = issuers.map(issuer => ({
        name: issuer.issuerName.length > 20 ? issuer.issuerName.substring(0, 20) + '...' : issuer.issuerName,
        Activos: issuer.capital.activosTotales || 0,
        Patrimonio: issuer.capital.patrimonio || 0,
        Pasivos: issuer.capital.pasivos || 0,
    }));

    // Prepare Liquidity Comparison
    const liquidityData = issuers.map(issuer => ({
        name: issuer.issuerName.length > 20 ? issuer.issuerName.substring(0, 20) + '...' : issuer.issuerName,
        'Ratio Circulante': issuer.liquidez.ratioCirculante || 0,
        'Prueba Ácida': issuer.liquidez.pruebaAcida || 0,
    }));

    // Chart styling for dark theme
    const chartTheme = {
        gridColor: '#334155', // slate-700
        textColor: '#94a3b8', // slate-400
        tooltipBg: '#1e293b', // slate-800
        tooltipBorder: '#475569', // slate-600
        tooltipText: '#f1f5f9', // slate-100
    };

    const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: any[]; label?: string }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-bg-tertiary border border-border-subtle p-3 rounded-lg shadow-xl">
                    <p className="text-text-primary font-semibold mb-2">{label}</p>
                    {payload.map((entry: any, index: number) => (
                        <p key={index} style={{ color: entry.color }} className="text-sm">
                            {entry.name}: {entry.value.toLocaleString('es-NI', { maximumFractionDigits: 2 })}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="space-y-6">
            {/* Radar Chart - Overall Comparison */}
            <div className="card border border-border-subtle">
                <h3 className="text-lg font-semibold text-text-primary mb-4">
                    📊 Comparación Panorámica (Radar)
                </h3>
                <ResponsiveContainer width="100%" height={400}>
                    <RadarChart data={radarData}>
                        <PolarGrid stroke={chartTheme.gridColor} />
                        <PolarAngleAxis dataKey="dimension" tick={{ fill: chartTheme.textColor }} />
                        <PolarRadiusAxis angle={90} domain={[0, 10]} tick={{ fill: chartTheme.textColor }} />
                        {issuers.map((issuer, idx) => (
                            <Radar
                                key={idx}
                                name={issuer.issuerName}
                                dataKey={issuer.issuerName}
                                stroke={colors[idx % colors.length]}
                                fill={colors[idx % colors.length]}
                                fillOpacity={0.3}
                            />
                        ))}
                        <Legend wrapperStyle={{ color: chartTheme.textColor }} />
                        <Tooltip content={<CustomTooltip />} />
                    </RadarChart>
                </ResponsiveContainer>
                <p className="text-xs text-text-tertiary mt-2 text-center">
                    Valores normalizados en escala 0-10 para comparación visual
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* ROE/ROA Comparison */}
                <div className="card border border-border-subtle">
                    <h3 className="text-lg font-semibold text-text-primary mb-4">
                        💰 Rentabilidad (ROE vs ROA)
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={roeData}>
                            <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridColor} />
                            <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} tick={{ fill: chartTheme.textColor }} />
                            <YAxis tick={{ fill: chartTheme.textColor }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{ color: chartTheme.textColor }} />
                            <Bar dataKey="ROE" fill="#f59e0b" name="ROE (%)" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="ROA" fill="#10b981" name="ROA (%)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Liquidity Comparison */}
                <div className="card border border-border-subtle">
                    <h3 className="text-lg font-semibold text-text-primary mb-4">
                        💧 Liquidez
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={liquidityData}>
                            <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridColor} />
                            <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} tick={{ fill: chartTheme.textColor }} />
                            <YAxis tick={{ fill: chartTheme.textColor }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{ color: chartTheme.textColor }} />
                            <Bar dataKey="Ratio Circulante" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="Prueba Ácida" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Capital Structure Comparison */}
            <div className="card border border-border-subtle">
                <h3 className="text-lg font-semibold text-text-primary mb-4">
                    📊 Estructura de Capital (Millones)
                </h3>
                <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={capitalData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridColor} />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} tick={{ fill: chartTheme.textColor }} />
                        <YAxis tick={{ fill: chartTheme.textColor }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ color: chartTheme.textColor }} />
                        <Bar dataKey="Activos" fill="#8b5cf6" name="Activos (M)" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Patrimonio" fill="#10b981" name="Patrimonio (M)" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Pasivos" fill="#ef4444" name="Pasivos (M)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default ComparisonCharts;
