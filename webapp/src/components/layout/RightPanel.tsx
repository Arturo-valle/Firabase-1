import { useState, useEffect } from 'react';
import { StarIcon, PlusIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { fetchIssuers, DISPLAY_NAMES, ISSUER_METADATA } from '../../utils/marketDataApi';

interface WatchlistItem {
    id: string;
    name: string;
    ticker: string;
    rating: string;
    change: number;
    changePercent: number;
    isStarred: boolean;
}

type TabType = 'all' | 'gainers' | 'losers' | 'active';

export default function RightPanel() {
    const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
    const [activeTab, setActiveTab] = useState<TabType>('all');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            try {
                const data = await fetchIssuers();
                const processed = (data.issuers || []).map((issuer: any, _index: number, arr: any[]) => {
                    const docCount = issuer.documents?.length || 0;
                    const avgDocs = arr.reduce((sum, i) => sum + (i.documents?.length || 0), 0) / arr.length;
                    // Calculate relative performance: positive if above avg, negative if below
                    const relativePerf = avgDocs > 0 ? ((docCount - avgDocs) / avgDocs) * 10 : 0;

                    return {
                        id: issuer.id,
                        name: DISPLAY_NAMES[issuer.id] || issuer.name,
                        ticker: ISSUER_METADATA[issuer.id]?.acronym || issuer.acronym || issuer.name.substring(0, 4).toUpperCase(),
                        rating: 'N/D',
                        change: docCount,
                        changePercent: Math.round(relativePerf * 10) / 10, // Performance relative to avg docs
                        isStarred: false
                    };
                });
                setWatchlist(processed);
            } catch (error) {
                console.error('Error loading watchlist:', error);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

    const toggleStar = (id: string) => {
        setWatchlist(prev =>
            prev.map(item =>
                item.id === id ? { ...item, isStarred: !item.isStarred } : item
            )
        );
    };



    const getFilteredList = () => {
        switch (activeTab) {
            case 'gainers':
                return watchlist.filter(item => item.changePercent > 0).sort((a, b) => b.changePercent - a.changePercent);
            case 'losers':
                return watchlist.filter(item => item.changePercent < 0).sort((a, b) => a.changePercent - b.changePercent);
            case 'active':
                return watchlist.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
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
        <div className="fixed right-0 top-16 w-80 h-[calc(100vh-4rem)] bg-black/60 backdrop-blur-xl border-l border-white/5 overflow-hidden flex flex-col z-30">
            {/* Header */}
            <div className="p-4 border-b border-white/5 bg-white/5">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2 font-mono uppercase tracking-wider">
                        <StarIconSolid className="w-4 h-4 text-accent-primary" />
                        Watchlist
                    </h3>
                    <button className="p-1 hover:bg-white/10 rounded transition-colors text-text-tertiary hover:text-white">
                        <PlusIcon className="w-4 h-4" />
                    </button>
                </div>

                {/* Neon Tabs */}
                <div className="flex bg-black/40 rounded p-1 border border-white/5">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                                flex-1 py-1 rounded text-[10px] font-mono font-bold uppercase tracking-wider transition-all
                                ${activeTab === tab.id
                                    ? 'bg-accent-primary/20 text-accent-primary shadow-glow-cyan'
                                    : 'text-text-tertiary hover:text-white'
                                }
                            `}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent p-2">
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
                                    hover:bg-white/5 border border-transparent hover:border-white/5
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
                                        <span className="font-mono font-bold text-white text-xs tracking-wide">
                                            {item.ticker}
                                        </span>
                                        <span className={`text-xs font-mono flex items-center gap-1 ${item.changePercent >= 0 ? 'text-status-success' : 'text-status-danger'}`}>
                                            {item.changePercent >= 0 ? '+' : ''}{item.changePercent.toFixed(1)}%
                                            {item.changePercent >= 0 ? <ArrowTrendingUpIcon className="w-3 h-3" /> : <ArrowTrendingDownIcon className="w-3 h-3" />}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between mt-0.5">
                                        <span className="text-[10px] text-text-tertiary truncate max-w-[120px]">
                                            {item.name}
                                        </span>
                                        <span className="text-[10px] text-text-secondary bg-white/5 px-1 rounded">
                                            {item.change} Docs
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
            <div className="p-3 bg-black/80 border-t border-white/5 backdrop-blur-md">
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
