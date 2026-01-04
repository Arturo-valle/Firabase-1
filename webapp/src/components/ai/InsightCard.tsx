import { useState, useEffect } from 'react';
import { SparklesIcon, LightBulbIcon } from '@heroicons/react/24/outline';
import Citations from './Citations';
import { useAIResearch, Insight } from '../../hooks/useAIResearch';

interface InsightCardProps {
    issuerId: string;
    issuerName: string;
}

export default function InsightCard({ issuerId, issuerName }: InsightCardProps) {
    const [insight, setInsight] = useState<Insight | null>(null);
    const { loading, error, getInsight } = useAIResearch();

    useEffect(() => {
        loadInsight();
    }, [issuerId]);

    async function loadInsight() {
        try {
            const data = await getInsight(issuerId);
            setInsight(data);
        } catch (err) {
            console.error('Failed to load insight:', err);
        }
    }

    const getSentimentColor = (sentiment: string) => {
        switch (sentiment) {
            case 'positive': return 'border-status-success bg-status-success/5 text-status-success';
            case 'negative': return 'border-status-danger bg-status-danger/5 text-status-danger';
            default: return 'border-text-tertiary bg-text-tertiary/5 text-text-tertiary';
        }
    };

    const getSentimentIcon = (sentiment: string) => {
        switch (sentiment) {
            case 'positive': return '📈';
            case 'negative': return '📉';
            default: return '➡️';
        }
    };

    if (loading) {
        return (
            <div className="card">
                <div className="flex items-center justify-center py-8">
                    <div className="animate-spin w-8 h-8 border-4 border-accent-primary border-t-transparent rounded-full" />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="card">
                <div className="flex items-center gap-2 mb-3">
                    <LightBulbIcon className="w-5 h-5 text-text-tertiary" />
                    <span className="text-sm text-text-tertiary">AI Insight</span>
                </div>
                <p className="text-text-tertiary text-sm">{error}</p>
            </div>
        );
    }

    if (!insight) {
        return null;
    }

    return (
        <div className={`card border-2 transition-all duration-300 ${getSentimentColor(insight.sentiment)}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <SparklesIcon className="w-5 h-5 text-accent-primary" />
                    <span className="text-sm font-semibold text-text-primary">AI Insight</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-2xl">{getSentimentIcon(insight.sentiment)}</span>
                    <div className="text-right">
                        <div className="text-xs text-text-tertiary">Confianza</div>
                        <div className="text-sm font-bold text-text-primary">
                            {(insight.confidence * 100).toFixed(0)}%
                        </div>
                    </div>
                </div>
            </div>

            {/* Insight Text */}
            <p className="text-text-primary leading-relaxed mb-4">
                {insight.insight}
            </p>

            {/* Metrics */}
            {insight.metrics.length > 0 && (
                <>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                        {insight.metrics.map((m: string, i: number) => (
                            <div key={i} className="bg-bg-primary/50 rounded p-2 text-center border border-white/5">
                                <span className="text-xs text-gray-400 block">{m.split(':')[0]}</span>
                                <span className="text-sm font-bold text-white">{m.split(':')[1]}</span>
                            </div>
                        ))}
                    </div>

                    <Citations citations={insight.citations || []} />

                    <div className="mt-4 flex justify-between items-center text-xs text-gray-500">
                        <span>Confianza: {(insight.confidence * 100).toFixed(0)}%</span>
                        <span>Generado: {new Date(insight.generatedAt).toLocaleTimeString()}</span>
                    </div>
                </>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-border-subtle">
                <span className="text-xs text-text-tertiary">
                    {issuerName}
                </span>
                <button
                    onClick={loadInsight}
                    className="text-xs text-accent-primary hover:text-accent-primary/80 flex items-center gap-1"
                >
                    <SparklesIcon className="w-3 h-3" />
                    Regenerar
                </button>
            </div>
        </div>
    );
}
