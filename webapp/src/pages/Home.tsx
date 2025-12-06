
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowTrendingUpIcon,
    ChartBarIcon,
    SparklesIcon,
    CpuChipIcon
} from '@heroicons/react/24/outline';
import InteractiveChart from '../components/charts/InteractiveChart';
import MarketHeatmap from '../components/MarketHeatmap';
import NewsTicker from '../components/NewsTicker';
import {
    fetchIssuers,
    fetchAINews,
    fetchMetricsComparison,
    DISPLAY_NAMES,
    ISSUER_METADATA
} from '../utils/marketDataApi';
import type { Issuer } from '../types';
import { Link } from 'react-router-dom';

interface NewsItem {
    title: string;
    summary: string;
    timestamp: string;
    category: 'rating' | 'financials' | 'market';
    issuer?: string;
    sentiment?: 'positive' | 'negative' | 'neutral';
}

export default function Home() {
    const navigate = useNavigate();
    const [issuers, setIssuers] = useState<Issuer[]>([]);
    const [news, setNews] = useState<NewsItem[]>([]);
    const [comparisonData, setComparisonData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [chartMetric, setChartMetric] = useState<'roe' | 'liquidez'>('roe');

    // Fetch real data on mount
    useEffect(() => {
        async function loadData() {
            try {
                // 1. Issuers Data
                const issuersData = await fetchIssuers();
                const issuersList = issuersData.issuers?.map((issuer: any) => ({
                    id: issuer.id,
                    name: DISPLAY_NAMES[issuer.id] || issuer.name,
                    sector: ISSUER_METADATA[issuer.id]?.sector || issuer.sector || 'Privado',
                    acronym: ISSUER_METADATA[issuer.id]?.acronym || issuer.acronym || '',
                    documents: issuer.documents || [],
                    logoUrl: issuer.logoUrl || '',
                    processed: issuer.documents?.length || 0,
                    total: issuer.documents?.length || 0
                }))
                    .filter((issuer: any) => issuer.documents?.length > 0) || [];
                setIssuers(issuersList);

                // 2. AI News
                try {
                    const newsData = await fetchAINews(7);
                    if (newsData.success && newsData.newsItems) {
                        setNews(newsData.newsItems.map((item: any) => ({
                            title: item.title,
                            summary: item.summary,
                            timestamp: item.publishedAt || new Date().toISOString(),
                            category: item.category || 'market',
                            issuer: item.relatedIssuers?.[0],
                            sentiment: item.sentiment
                        })));
                    }
                } catch (e) {
                    console.error('Error fetching news:', e);
                }

                // 3. Metrics Comparison
                if (issuersList.length > 0) {
                    const topIssuers = issuersList.slice(0, 7).map((i: any) => i.id);
                    try {
                        const compData = await fetchMetricsComparison(topIssuers);
                        if (compData.success && compData.comparison) {
                            const chartData = compData.comparison.map((c: any) => ({
                                name: c.issuerName,
                                roe: c.metrics.rentabilidad?.roe || 0,
                                liquidez: c.metrics.liquidez?.ratioCirculante || 0,
                            }));
                            setComparisonData(chartData);
                        }
                    } catch (e) {
                        console.error('Error fetching comparison:', e);
                    }
                }

            } catch (error) {
                console.error('Failed to fetch dashboard data:', error);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-bg-primary">
                <div className="text-center">
                    <div className="animate-spin w-16 h-16 border-4 border-accent-primary border-t-transparent rounded-full mx-auto mb-4" />
                    <p className="text-accent-primary font-mono animate-pulse">Conectando a Verte AI...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-bg-primary flex flex-col animate-fade-in">
            {/* 1. Ticker Section */}
            <NewsTicker news={news} />

            <div className="p-6 space-y-6 flex-1 overflow-y-auto">

                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-status-success animate-pulse" />
                            NicaBloomberg AI
                            <span className="text-xs font-normal text-accent-primary border border-accent-primary/30 px-2 py-0.5 rounded-full">
                                POWERED BY GEMINI
                            </span>
                        </h1>
                        <p className="text-gray-400 text-sm mt-1">
                            Mercado de Valores de Nicaragua • {issuers.length} Emisores Activos • Datos en Tiempo Real
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <Link to="/finance" className="btn-secondary text-sm">
                            <ChartBarIcon className="w-4 h-4 mr-2" />
                            Análisis Financiero
                        </Link>
                    </div>
                </div>

                {/* Main Grid */}
                <div className="grid grid-cols-12 gap-6 h-[600px]">

                    {/* Left Col: Heatmap & Issuers (8 cols) */}
                    <div className="col-span-12 lg:col-span-8 flex flex-col gap-6 h-full">

                        {/* Heatmap Section */}
                        <div className="card h-2/3 flex flex-col p-0 overflow-hidden border-accent-primary/20">
                            <div className="p-4 border-b border-white/5 flex justify-between items-center bg-bg-elevated">
                                <h3 className="font-bold text-white flex items-center gap-2">
                                    <CpuChipIcon className="w-5 h-5 text-accent-primary" />
                                    Mapa de Calor del Mercado
                                </h3>
                                <div className="flex gap-2 text-xs">
                                    <span className="flex items-center gap-1 text-gray-400">
                                        <span className="w-2 h-2 rounded-full bg-blue-900" /> Banca
                                    </span>
                                    <span className="flex items-center gap-1 text-gray-400">
                                        <span className="w-2 h-2 rounded-full bg-emerald-900" /> Industria
                                    </span>
                                </div>
                            </div>
                            <div className="flex-1 p-4 bg-bg-primary/50">
                                <MarketHeatmap
                                    issuers={issuers}
                                    onIssuerClick={(id) => navigate(`/issuer/${encodeURIComponent(id)}`)}
                                />
                            </div>
                        </div>

                        {/* Chart Section */}
                        <div className="card h-1/3 flex flex-col p-0 border-white/10">
                            <div className="p-3 border-b border-white/5 flex justify-between items-center bg-bg-elevated">
                                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                                    <ArrowTrendingUpIcon className="w-4 h-4 text-accent-secondary" />
                                    Tendencias: {chartMetric === 'roe' ? 'Rentabilidad (ROE)' : 'Liquidez'}
                                </h3>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => setChartMetric('roe')}
                                        className={`px-2 py-0.5 rounded text-xs ${chartMetric === 'roe' ? 'bg-accent-primary text-black font-bold' : 'bg-white/5 text-gray-400'}`}
                                    >
                                        ROE
                                    </button>
                                    <button
                                        onClick={() => setChartMetric('liquidez')}
                                        className={`px-2 py-0.5 rounded text-xs ${chartMetric === 'liquidez' ? 'bg-accent-primary text-black font-bold' : 'bg-white/5 text-gray-400'}`}
                                    >
                                        Liquidez
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 w-full min-h-0">
                                <InteractiveChart
                                    data={comparisonData.map(d => ({
                                        date: d.name,
                                        value: chartMetric === 'roe' ? d.roe : d.liquidez
                                    }))}
                                    color={chartMetric === 'roe' ? '#06b6d4' : '#10b981'}
                                    showArea={true}
                                    height={160}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Right Col: AI Insights (4 cols) */}
                    <div className="col-span-12 lg:col-span-4 flex flex-col gap-6 h-full">
                        <div className="card h-full flex flex-col p-0 border-accent-primary/30 shadow-glow-cyan">
                            <div className="p-5 border-b border-white/10 bg-gradient-to-r from-bg-elevated to-bg-primary">
                                <h3 className="font-bold text-white flex items-center gap-2">
                                    <SparklesIcon className="w-5 h-5 text-accent-primary animate-pulse" />
                                    Verte AI Insights
                                </h3>
                                <p className="text-xs text-gray-400 mt-1">
                                    Análisis generativo en tiempo real de documentos oficiales.
                                </p>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                                {news.length > 0 ? (
                                    news.map((item, idx) => (
                                        <div key={idx} className="group relative pl-4 border-l-2 border-white/10 hover:border-accent-primary transition-colors">
                                            <div className="absolute -left-[5px] top-0 w-2 h-2 rounded-full bg-bg-primary border border-white/20 group-hover:border-accent-primary group-hover:bg-accent-primary transition-all" />

                                            <h4 className="text-sm font-bold text-gray-200 group-hover:text-accent-primary transition-colors">
                                                {item.title}
                                            </h4>
                                            <p className="text-xs text-gray-400 mt-1 leading-relaxed line-clamp-3">
                                                {item.summary}
                                            </p>

                                            <div className="flex items-center gap-2 mt-2">
                                                <span className="text-[10px] text-gray-500 uppercase tracking-wider">
                                                    {new Date(item.timestamp).toLocaleDateString()}
                                                </span>
                                                {item.issuer && (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-gray-300">
                                                        {item.issuer}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-10 text-gray-500">
                                        <SparklesIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                        Generando insights...
                                    </div>
                                )}
                            </div>

                            <div className="p-4 border-t border-white/10 bg-bg-elevated">
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Pregunta a Verte AI sobre el mercado..."
                                        className="w-full bg-bg-primary border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary transition-all"
                                    />
                                    <SparklesIcon className="absolute right-3 top-2.5 w-4 h-4 text-gray-500" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
