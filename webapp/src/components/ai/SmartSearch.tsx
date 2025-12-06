import { useState } from 'react';
import { MagnifyingGlassIcon, SparklesIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface SearchResult {
    answer: string;
    sources: Array<{
        issuer: string;
        documentTitle: string;
        relevance: number;
    }>;
    metadata: {
        chunksUsed: number;
        documentsFound: number;
        yearsFound: string;
    };
    queryUnderstanding?: {
        intent: string;
        issuers: string[];
        metrics: string[];
        timeframe?: string;
        enhancedQuery: string;
    };
}

const API_BASE_URL = 'https://us-central1-mvp-nic-market.cloudfunctions.net/api';

export default function SmartSearch() {
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<SearchResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function handleSearch(e: React.FormEvent) {
        e.preventDefault();

        if (!query.trim()) return;

        try {
            setLoading(true);
            setError(null);
            setResult(null);

            const response = await fetch(`${API_BASE_URL}/ai/smart-search`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: query.trim() }),
            });

            if (!response.ok) {
                throw new Error('Search failed');
            }

            const data = await response.json();

            setResult({
                answer: data.results.answer,
                sources: data.results.sources,
                metadata: data.results.metadata,
                queryUnderstanding: data.queryUnderstanding,
            });
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    const getIntentBadge = (intent: string) => {
        switch (intent) {
            case 'search_issuer': return { label: 'Buscar Emisor', color: 'bg-accent-primary/20 text-accent-primary' };
            case 'compare_issuers': return { label: 'Comparar', color: 'bg-accent-secondary/20 text-accent-secondary' };
            case 'analyze_metric': return { label: 'Analizar Métrica', color: 'bg-status-success/20 text-status-success' };
            default: return { label: 'Consulta General', color: 'bg-text-tertiary/20 text-text-tertiary' };
        }
    };

    return (
        <div className="card">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <SparklesIcon className="w-6 h-6 text-accent-primary" />
                <h3 className="text-xl font-bold text-text-primary">Smart Search</h3>
                <span className="badge badge-accent text-xs">Beta</span>
            </div>

            {/* Search Form */}
            <form onSubmit={handleSearch} className="mb-6">
                <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Pregunta cualquier cosa sobre los emisores... (ej: ¿Cuál emisor tiene mejor liquidez?)"
                        className="
              w-full pl-12 pr-32 py-4 bg-bg-tertiary border border-border-default rounded-xl
              text-text-primary placeholder:text-text-tertiary
              focus:outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20
              transition-all duration-200
            "
                        disabled={loading}
                    />
                    <button
                        type="submit"
                        disabled={loading || !query.trim()}
                        className="
              absolute right-2 top-1/2 -translate-y-1/2
              px-4 py-2 bg-accent-primary text-white rounded-lg
              hover:bg-accent-primary/90 disabled:opacity-50 disabled:cursor-not-allowed
              transition-all duration-200 flex items-center gap-2
            "
                    >
                        {loading ? (
                            <>
                                <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                Buscando...
                            </>
                        ) : (
                            <>
                                <SparklesIcon className="w-4 h-4" />
                                Buscar
                            </>
                        )}
                    </button>
                </div>

                {/* Example Queries */}
                <div className="mt-3 flex flex-wrap gap-2">
                    <span className="text-text-tertiary text-xs">Prueba:</span>
                    {[
                        '¿Cuál emisor tiene mejor calificación?',
                        'Comparar FAMA y Banpro',
                        'Índices de morosidad',
                    ].map((example, idx) => (
                        <button
                            key={idx}
                            type="button"
                            onClick={() => setQuery(example)}
                            className="text-xs px-2 py-1 bg-bg-tertiary hover:bg-bg-elevated rounded text-text-secondary hover:text-text-primary transition-colors"
                            disabled={loading}
                        >
                            {example}
                        </button>
                    ))}
                </div>
            </form>

            {/* Loading State */}
            {loading && (
                <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                        <div className="animate-spin w-12 h-12 border-4 border-accent-primary border-t-transparent rounded-full mx-auto mb-4" />
                        <p className="text-text-secondary">Procesando con IA...</p>
                    </div>
                </div>
            )}

            {/* Error State */}
            {error && (
                <div className="bg-status-danger/10 border border-status-danger/20 rounded-lg p-4">
                    <p className="text-status-danger">Error: {error}</p>
                </div>
            )}

            {/* Results */}
            {result && !loading && (
                <div className="space-y-6">
                    {/* Query Understanding */}
                    {result.queryUnderstanding && (
                        <div className="p-4 bg-bg-tertiary rounded-lg">
                            <div className="flex items-center gap-2 mb-3">
                                <SparklesIcon className="w-4 h-4 text-accent-primary" />
                                <span className="text-sm font-semibold text-text-primary">Interpretación IA</span>
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-text-tertiary text-xs">Intent:</span>
                                    <span className={`badge text-xs ${getIntentBadge(result.queryUnderstanding.intent).color}`}>
                                        {getIntentBadge(result.queryUnderstanding.intent).label}
                                    </span>
                                </div>
                                {result.queryUnderstanding.issuers.length > 0 && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-text-tertiary text-xs">Emisores:</span>
                                        {result.queryUnderstanding.issuers.map((issuer, idx) => (
                                            <span key={idx} className="badge badge-primary text-xs">
                                                {issuer}
                                            </span>
                                        ))}
                                    </div>
                                )}
                                {result.queryUnderstanding.metrics.length > 0 && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-text-tertiary text-xs">Métricas:</span>
                                        {result.queryUnderstanding.metrics.map((metric, idx) => (
                                            <span key={idx} className="badge badge-secondary text-xs">
                                                {metric}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Answer */}
                    <div className="p-6 bg-bg-elevated border border-border-emphasis rounded-lg">
                        <div className="prose prose-invert max-w-none">
                            <p className="text-text-primary leading-relaxed whitespace-pre-wrap">
                                {result.answer}
                            </p>
                        </div>
                    </div>

                    {/* Metadata */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="metric-card">
                            <span className="metric-label">Chunks Usados</span>
                            <span className="metric-value">{result.metadata.chunksUsed}</span>
                        </div>
                        <div className="metric-card">
                            <span className="metric-label">Documentos</span>
                            <span className="metric-value">{result.metadata.documentsFound}</span>
                        </div>
                        <div className="metric-card">
                            <span className="metric-label">Años</span>
                            <span className="metric-value text-base">{result.metadata.yearsFound}</span>
                        </div>
                    </div>

                    {/* Sources */}
                    {result.sources.length > 0 && (
                        <div>
                            <h4 className="text-sm font-semibold text-text-primary mb-3">Fuentes Consultadas</h4>
                            <div className="space-y-2">
                                {result.sources.map((source, idx) => (
                                    <div
                                        key={idx}
                                        className="p-3 bg-bg-tertiary rounded-lg flex items-center justify-between"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <span className="text-text-primary text-sm font-medium block truncate">
                                                {source.documentTitle}
                                            </span>
                                            <span className="text-text-tertiary text-xs">
                                                {source.issuer}
                                            </span>
                                        </div>
                                        <div className="ml-3">
                                            <div className="w-16 h-1.5 bg-bg-primary rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-accent-primary"
                                                    style={{ width: `${source.relevance * 100}%` }}
                                                />
                                            </div>
                                            <span className="text-text-tertiary text-xs">
                                                {(source.relevance * 100).toFixed(0)}%
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
