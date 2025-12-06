import React, { useState, useEffect } from 'react';
import type { Issuer } from '../types';
import { ArrowTrendingUpIcon } from '@heroicons/react/24/outline';
import { fetchIssuerHistory } from '../utils/marketDataApi';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface FinancialDashboardProps {
    issuers: Issuer[];
}

const FinancialDashboard: React.FC<FinancialDashboardProps> = ({ issuers }) => {
    const [historyData, setHistoryData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedIssuer, setSelectedIssuer] = useState<string | null>(null);

    // Filter active issuers
    const activeIssuers = issuers.filter(i => i.sector === 'Privado' || i.sector === 'Público'); // Adjust filter as needed based on "Emisores Activos" logic or whitelist

    useEffect(() => {
        if (activeIssuers.length > 0 && !selectedIssuer) {
            setSelectedIssuer(activeIssuers[0].id);
        }
    }, [activeIssuers, selectedIssuer]);

    useEffect(() => {
        if (selectedIssuer) {
            setLoading(true);
            fetchIssuerHistory(selectedIssuer)
                .then(data => {
                    // Reformat for chart: ensure chronological order (oldest first)
                    const formattedDetails = data
                        .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
                        .map((item: any) => ({
                            period: item.period,
                            value: item.activosTotales || item.ingresosTotales || 0, // Fallback to assets or revenue
                            label: 'Activos Totales' // Or dynamic based on what we show
                        }));
                    setHistoryData(formattedDetails);
                })
                .catch(err => console.error("Failed to load history", err))
                .finally(() => setLoading(false));
        }
    }, [selectedIssuer]);

    return (
        <div className="flex flex-col gap-6">
            {/* Welcome Section */}
            <div>
                <h1 className="text-2xl font-bold text-text-primary mb-1">Bienvenido de vuelta 👋</h1>
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                    <span className="w-2 h-2 rounded-full bg-accent-primary"></span>
                    <span>Sistema Operativo • {issuers.length} Emisores Procesados</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Financial Comparison Chart */}
                <div className="bg-bg-secondary border border-border-subtle rounded-xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                            <span className="text-accent-primary">📊</span> Evolución Financiera
                        </h2>
                        {selectedIssuer && (
                            <span className="text-xs text-text-secondary bg-bg-tertiary px-2 py-1 rounded">
                                {activeIssuers.find(i => i.id === selectedIssuer)?.name}
                            </span>
                        )}
                    </div>

                    <div className="h-[300px] w-full items-center justify-center border border-dashed border-border-subtle rounded-lg bg-bg-tertiary/20 relative">
                        {loading ? (
                            <div className="absolute inset-0 flex items-center justify-center text-text-secondary">
                                Cargando datos históricos...
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
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                                    <XAxis dataKey="period" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#f3f4f6' }}
                                        itemStyle={{ color: '#c4b5fd' }}
                                        formatter={(value: number) => [`C$ ${value.toLocaleString()}`, 'Activos Totales']}
                                    />
                                    <Area type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                                <p className="text-text-secondary font-medium">Datos históricos aún no disponibles</p>
                                <p className="text-text-tertiary text-sm mt-1">
                                    Estamos procesando los reportes trimestrales de este emisor.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Active Issuers List */}
                <div className="bg-bg-secondary border border-border-subtle rounded-xl p-6 shadow-sm flex flex-col">
                    <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                        <span className="text-accent-secondary">🏢</span> Emisores Activos
                    </h2>
                    <div className="flex-1 overflow-y-auto pr-2 space-y-3 max-h-[300px] scrollbar-thin">
                        {activeIssuers.slice(0, 5).map((issuer) => (
                            <div
                                key={issuer.id}
                                onClick={() => setSelectedIssuer(issuer.id)}
                                className={`flex items-center justify-between p-3 rounded-lg transition-colors cursor-pointer group ${selectedIssuer === issuer.id ? 'bg-bg-elevated border border-accent-primary/30' : 'bg-bg-tertiary hover:bg-bg-elevated'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-accent-primary/20 flex items-center justify-center text-accent-primary font-bold text-sm">
                                        {issuer.acronym || issuer.name.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-medium text-text-primary group-hover:text-accent-primary transition-colors">
                                            {issuer.name}
                                        </h3>
                                        <p className="text-xs text-text-secondary">{(issuer as any).stats?.totalDocs || 0} docs</p>
                                    </div>
                                </div>
                                <ArrowTrendingUpIcon className="w-4 h-4 text-text-tertiary group-hover:text-accent-primary transition-colors" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* AI Generated News Section */}
            <div className="bg-bg-secondary border border-border-subtle rounded-xl p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                    <span className="text-accent-primary">🗞️</span> Noticias Generadas por IA
                </h2>
                <div className="h-32 flex items-center justify-center text-text-tertiary text-sm border border-dashed border-border-subtle rounded-lg">
                    Generando noticias basadas en los documentos procesados...
                </div>
            </div>
        </div>
    );
};

export default FinancialDashboard;
