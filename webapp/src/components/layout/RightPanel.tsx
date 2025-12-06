import { useState, useEffect } from 'react';
import { StarIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
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
                const processed = (data.issuers || []).map((issuer: any) => ({
                    id: issuer.id,
                    name: DISPLAY_NAMES[issuer.id] || issuer.name, // Force clean name
                    ticker: ISSUER_METADATA[issuer.id]?.acronym || issuer.acronym || issuer.name.substring(0, 4).toUpperCase(), // Force clean ticker
                    rating: 'N/D', // Placeholder until we have real rating data
                    change: issuer.documents?.length || 0,
                    changePercent: 0,
                    isStarred: false
                }));
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

    const removeItem = (id: string) => {
        setWatchlist(prev => prev.filter(item => item.id !== id));
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
        { id: 'all', label: 'Todos' },
        { id: 'gainers', label: 'Ganadores' },
        { id: 'losers', label: 'Perdedores' },
        { id: 'active', label: 'Activos' },
    ];

    return (
        <div className="fixed right-0 top-16 w-80 h-[calc(100vh-4rem)] bg-bg-secondary border-l border-border-subtle overflow-y-auto scrollbar-thin">
            {/* Header */}
            <div className="sticky top-0 bg-bg-secondary/95 backdrop-blur-xl border-b border-border-subtle z-10 p-4">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                        <StarIconSolid className="w-5 h-5 text-accent-primary" />
                        Watchlist
                    </h3>
                    <button className="p-1.5 hover:bg-bg-tertiary rounded-lg transition-colors">
                        <PlusIcon className="w-5 h-5 text-text-secondary" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 bg-bg-tertiary rounded-lg p-1">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-all
                ${activeTab === tab.id
                                    ? 'bg-bg-primary text-text-primary'
                                    : 'text-text-secondary hover:text-text-primary'
                                }
              `}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Watchlist Items */}
            <div className="p-2">
                {loading ? (
                    <div className="flex justify-center py-8">
                        <div className="animate-spin w-6 h-6 border-2 border-accent-primary border-t-transparent rounded-full" />
                    </div>
                ) : (
                    <>
                        {getFilteredList().map((item) => (
                            <div
                                key={item.id}
                                className="
                  group relative flex items-center gap-3 p-3 mb-2
                  bg-bg-tertiary hover:bg-bg-elevated rounded-lg
                  transition-all duration-200 cursor-pointer
                "
                            >
                                {/* Star Icon */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleStar(item.id);
                                    }}
                                    className="flex-shrink-0"
                                >
                                    {item.isStarred ? (
                                        <StarIconSolid className="w-4 h-4 text-accent-primary" />
                                    ) : (
                                        <StarIcon className="w-4 h-4 text-text-tertiary hover:text-accent-primary transition-colors" />
                                    )}
                                </button>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-semibold text-text-primary text-sm truncate">
                                            {item.ticker}
                                        </span>
                                        <span className={`
                      text-xs font-bold text-accent-primary
                    `}>
                                            {item.change} Docs
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-text-tertiary text-xs truncate mr-2">
                                            {item.name}
                                        </span>
                                        <span className="text-text-tertiary text-xs">
                                            {item.rating}
                                        </span>
                                    </div>
                                </div>

                                {/* Remove Button (visible on hover) */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        removeItem(item.id);
                                    }}
                                    className="
                    absolute top-1 right-1 p-1 bg-bg-primary rounded
                    opacity-0 group-hover:opacity-100 transition-opacity
                  "
                                >
                                    <XMarkIcon className="w-3 h-3 text-text-tertiary" />
                                </button>
                            </div>
                        ))}
                    </>
                )}
            </div>

            {/* Empty State */}
            {getFilteredList().length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                    <StarIcon className="w-12 h-12 text-text-tertiary mb-3" />
                    <p className="text-text-secondary text-sm mb-1">No hay emisores</p>
                    <p className="text-text-tertiary text-xs">
                        Agrega emisores a tu watchlist para monitorear
                    </p>
                </div>
            )}

            {/* Footer Stats */}
            <div className="sticky bottom-0 bg-bg-secondary/95 backdrop-blur-xl border-t border-border-subtle p-4">
                <div className="grid grid-cols-2 gap-3">
                    <div className="metric-card">
                        <span className="metric-label">Ganadores</span>
                        <span className="text-status-success text-xl font-bold">
                            {watchlist.filter(i => i.changePercent > 0).length}
                        </span>
                    </div>
                    <div className="metric-card">
                        <span className="metric-label">Perdedores</span>
                        <span className="text-status-danger text-xl font-bold">
                            {watchlist.filter(i => i.changePercent < 0).length}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
