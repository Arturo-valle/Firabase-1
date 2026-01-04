import { useState, useEffect } from 'react';
import { SparklesIcon, NewspaperIcon } from '@heroicons/react/24/outline';
import { useAIResearch, NewsItem } from '../../hooks/useAIResearch';

export default function AINewsFeed() {
    const [news, setNews] = useState<NewsItem[]>([]);
    const { loading, error, getNews } = useAIResearch();
    const [daysBack, setDaysBack] = useState(7);

    useEffect(() => {
        loadNews();
    }, [daysBack]);

    async function loadNews() {
        try {
            const newsItems = await getNews(daysBack);
            setNews(newsItems);
        } catch (err: any) {
            // Error is handled by the hook, we can handle it specifically if needed
            setNews([]);
        }
    }

    const getCategoryColor = (category: string) => {
        switch (category) {
            case 'rating': return 'bg-accent-primary/20 text-accent-primary';
            case 'financials': return 'bg-status-success/20 text-status-success';
            case 'market': return 'bg-accent-secondary/20 text-accent-secondary';
            case 'announcement': return 'bg-accent-tertiary/20 text-accent-tertiary';
            default: return 'bg-text-tertiary/20 text-text-tertiary';
        }
    };

    if (loading) {
        return (
            <div className="card">
                <div className="flex items-center gap-3 mb-6">
                    <SparklesIcon className="w-6 h-6 text-accent-primary" />
                    <h3 className="text-xl font-bold text-text-primary">AI News Feed</h3>
                </div>
                <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                        <div className="animate-spin w-12 h-12 border-4 border-accent-primary border-t-transparent rounded-full mx-auto mb-4" />
                        <p className="text-text-secondary">Generando noticias...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="card">
                <div className="flex items-center gap-3 mb-6">
                    <SparklesIcon className="w-6 h-6 text-accent-primary" />
                    <h3 className="text-xl font-bold text-text-primary">AI News Feed</h3>
                </div>
                <div className="bg-status-danger/10 border border-status-danger/20 rounded-lg p-4">
                    <p className="text-status-danger">Error: {error}</p>
                    <button onClick={loadNews} className="btn-ghost mt-2">
                        Reintentar
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="card">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <SparklesIcon className="w-6 h-6 text-accent-primary" />
                    <h3 className="text-xl font-bold text-text-primary">AI News Feed</h3>
                    <span className="badge badge-primary text-xs">
                        {news.length} noticias
                    </span>
                </div>

                {/* Time range selector */}
                <div className="flex items-center gap-2">
                    <span className="text-text-tertiary text-sm">Últimos </span>
                    <select
                        value={daysBack}
                        onChange={(e) => setDaysBack(Number(e.target.value))}
                        className="bg-bg-tertiary border border-border-default rounded-lg px-3 py-1.5 text-text-primary text-sm focus:outline-none focus:border-accent-primary"
                    >
                        <option value={1}>1 día</option>
                        <option value={3}>3 días</option>
                        <option value={7}>7 días</option>
                        <option value={14}>14 días</option>
                        <option value={30}>30 días</option>
                    </select>
                </div>
            </div>

            {/* News Items */}
            {news.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                    <NewspaperIcon className="w-16 h-16 text-text-tertiary mb-4" />
                    <p className="text-text-secondary">No hay noticias para este período</p>
                    <p className="text-text-tertiary text-sm">Procesa más documentos para generar noticias</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {news.map((item) => (
                        <div
                            key={item.id}
                            className="
                group p-4 bg-bg-tertiary hover:bg-bg-elevated rounded-lg
                transition-all duration-200 cursor-pointer border border-transparent
                hover:border-border-emphasis
              "
                        >
                            {/* Category Badge + AI Badge */}
                            <div className="flex items-center gap-2 mb-2">
                                <span className={`badge text-xs font-medium ${getCategoryColor(item.category)}`}>
                                    {item.category}
                                </span>
                                {item.isAIGenerated && (
                                    <span className="badge badge-accent text-xs flex items-center gap-1">
                                        <SparklesIcon className="w-3 h-3" />
                                        AI Generated
                                    </span>
                                )}
                            </div>

                            {/* Headline */}
                            <h4 className="text-text-primary font-bold mb-2 group-hover:text-accent-primary transition-colors">
                                {item.headline}
                            </h4>

                            {/* Summary */}
                            <p className="text-text-secondary text-sm mb-3">
                                {item.summary}
                            </p>

                            {/* Footer: Issuers + Time */}
                            <div className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                    {item.issuers.map((issuer, idx) => (
                                        <span
                                            key={idx}
                                            className="px-2 py-1 bg-bg-primary rounded text-text-tertiary"
                                        >
                                            {issuer}
                                        </span>
                                    ))}
                                </div>
                                <span className="text-text-tertiary">
                                    {new Date(item.timestamp).toLocaleDateString('es-NI', {
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </span>
                            </div>

                            {/* Document Source (on hover) */}
                            <div className="mt-2 text-xs text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity">
                                Fuente: {item.documentSource}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Refresh Button */}
            <div className="mt-6 flex justify-center">
                <button
                    onClick={loadNews}
                    className="btn-ghost text-sm flex items-center gap-2"
                    disabled={loading}
                >
                    <SparklesIcon className="w-4 h-4" />
                    Regenerar Noticias
                </button>
            </div>
        </div>
    );
}
