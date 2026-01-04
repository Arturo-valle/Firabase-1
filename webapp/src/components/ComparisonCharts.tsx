import React from 'react';
import {
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
import { useComparatorData } from '../hooks/useComparatorData';

interface ComparisonChartsProps {
    issuers: IssuerMetrics[];
}

const ComparisonCharts: React.FC<ComparisonChartsProps> = ({ issuers }) => {
    const { capitalData } = useComparatorData(issuers);

    if (issuers.length === 0) return null;

    // "NicaBloomberg" Neon Palette Palette handled by tailwind/components


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
        <div className="w-full h-full">
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
    );
};

export default ComparisonCharts;
