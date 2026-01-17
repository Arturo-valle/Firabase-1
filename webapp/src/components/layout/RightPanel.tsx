import { useState, useMemo } from 'react';
import { StarIcon, PlusIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { DISPLAY_NAMES, ISSUER_METADATA } from '../../utils/marketDataApi';
import { useMarketData } from '../../hooks/useMarketData';

interface WatchlistItem {
    id: string;
    name: string;
    ticker: string;
    roe: number;           // ROE actual
    roeTrend: number;      // Variación vs promedio (tendencia)
    totalAssets: number;   // Activos totales para referencia
    isStarred: boolean;
}

type TabType = 'all' | 'gainers' | 'losers' | 'active';

export default function RightPanel() {
    const [starredIds, setStarredIds] = useState<Set<string>>(new Set());
    const [activeTab, setActiveTab] = useState<TabType>('all');

    // Usar el hook centralizado en lugar de fetch manual
    const { issuers, metrics, isLoading: loading } = useMarketData();

    // Procesar watchlist cuando los datos cambien
    const watchlist = useMemo<WatchlistItem[]>(() => {
        if (issuers.length === 0) return [];

        const comparison = metrics || [];

        // Calcular ROE promedio para determinar tendencia
        const roes = comparison.map((item: any) => {
            const metricsData = item.metrics || item;
            return metricsData?.rentabilidad?.roe || 0;
        }).filter((roe: number) => roe > 0);
        const avgRoe = roes.length > 0 ? roes.reduce((a: number, b: number) => a + b, 0) / roes.length : 0;

        // Construir watchlist con datos reales
        return issuers.map((issuer: any) => {
            const metricsData = comparison.find((c: any) =>
                c.issuerId === issuer.id || c.id === issuer.id
            );
            const issuerMetrics = metricsData?.metrics || metricsData || {};
            const roe = issuerMetrics?.rentabilidad?.roe || 0;
            const totalAssets = issuerMetrics?.capital?.activosTotales || 0;

            // Tendencia: positiva si ROE > promedio, negativa si < promedio
            const roeTrend = avgRoe > 0 ? ((roe - avgRoe) / avgRoe) * 100 : 0;

            return {
                id: issuer.id,
                name: DISPLAY_NAMES[issuer.id] || issuer.name,
                ticker: ISSUER_METADATA[issuer.id]?.acronym || issuer.acronym || issuer.name.substring(0, 4).toUpperCase(),
                roe: roe,
                roeTrend: Math.round(roeTrend * 10) / 10,
                totalAssets: totalAssets,
                isStarred: starredIds.has(issuer.id)
            };
        });
    }, [issuers, metrics, starredIds]);

    const toggleStar = (id: string) => {
        setStarredIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };



    const getFilteredList = () => {
        switch (activeTab) {
            case 'gainers':
                return watchlist.filter(item => item.roeTrend > 0).sort((a, b) => b.roeTrend - a.roeTrend);
            case 'losers':
                return watchlist.filter(item => item.roeTrend < 0).sort((a, b) => a.roeTrend - b.roeTrend);
            case 'active':
                return watchlist.sort((a, b) => Math.abs(b.roeTrend) - Math.abs(a.roeTrend));
            default:
                return watchlist;
        }
    };

    const tabs: { id: TabType; label: string }[] = [
        { id: 'all', label: 'All' },
        { id: 'gainers', label: 'Up' },
        { id: 'losers', label: 'Down' },
    ];

    return (
        <div className="fixed right-0 top-16 w-80 h-[calc(100vh-4rem)] bg-bg-secondary/95 backdrop-blur-xl border-l border-border-subtle overflow-hidden flex flex-col z-30 shadow-xl">
            {/* Header */}
            <div className="p-4 border-b border-border-subtle bg-bg-tertiary/20">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-text-primary flex items-center gap-2 font-mono uppercase tracking-wider">
                        <StarIconSolid className="w-4 h-4 text-accent-primary" />
                        Watchlist
                    </h3>
                    <button className="p-1 hover:bg-bg-tertiary rounded transition-colors text-text-tertiary hover:text-text-primary">
                        <PlusIcon className="w-4 h-4" />
                    </button>
                </div>

                {/* Theme-Aware Tabs */}
                <div className="flex bg-bg-tertiary/50 rounded p-1 border border-border-subtle">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                                flex-1 py-1 rounded text-[10px] font-mono font-bold uppercase tracking-wider transition-all
                                ${activeTab === tab.id
                                    ? 'bg-accent-primary/10 text-accent-primary shadow-sm border border-accent-primary/20'
                                    : 'text-text-tertiary hover:text-text-primary'
                                }
                            `}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                {loading ? (
                    <div className="flex justify-center py-8">
                        <div className="animate-spin w-6 h-6 border-2 border-accent-primary border-t-transparent rounded-full" />
                    </div>
                ) : (
                    <div className="space-y-1">
                        {getFilteredList().map((item) => (
                            <div
                                key={item.id}
                                className="
                                    group relative flex items-center gap-3 p-3 rounded-lg
                                    hover:bg-bg-tertiary/50 border border-transparent hover:border-border-subtle
                                    transition-all duration-200 cursor-pointer
                                "
                            >
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleStar(item.id);
                                    }}
                                    className="flex-shrink-0"
                                >
                                    {item.isStarred ? (
                                        <StarIconSolid className="w-3.5 h-3.5 text-accent-primary" />
                                    ) : (
                                        <StarIcon className="w-3.5 h-3.5 text-text-tertiary opacity-50 group-hover:opacity-100 group-hover:text-accent-primary transition-all" />
                                    )}
                                </button>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <span className="font-mono font-bold text-text-primary text-xs tracking-wide">
                                            {item.ticker}
                                        </span>
                                        <span className={`text-xs font-mono flex items-center gap-1 ${item.roeTrend >= 0 ? 'text-finance-positive' : 'text-finance-negative'}`}>
                                            {item.roeTrend >= 0 ? '+' : ''}{item.roeTrend.toFixed(1)}%
                                            {item.roeTrend >= 0 ? <ArrowTrendingUpIcon className="w-3 h-3" /> : <ArrowTrendingDownIcon className="w-3 h-3" />}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between mt-0.5">
                                        <span className="text-[10px] text-text-tertiary truncate max-w-[120px]">
                                            {item.name}
                                        </span>
                                        <span className="text-[10px] text-accent-primary font-mono bg-bg-tertiary/50 px-1 rounded">
                                            ROE: {(item.roe * 100).toFixed(1)}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Empty State */}
                {!loading && getFilteredList().length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 px-6 text-center opacity-50">
                        <StarIcon className="w-8 h-8 text-text-tertiary mb-2" />
                        <p className="text-text-tertiary text-xs font-mono uppercase">No Active Signals</p>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="p-3 bg-bg-secondary/95 border-t border-border-subtle backdrop-blur-md">
                <div className="flex justify-between items-center text-[10px] text-text-tertiary font-mono">
                    <span>MKT STATUS</span>
                    <span className="text-status-success flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-status-success rounded-full animate-pulse"></span>
                        LIVE
                    </span>
                </div>
            </div>
        </div>
    );
}
