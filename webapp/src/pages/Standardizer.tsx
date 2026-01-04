import MetricsStandardizer from '../components/MetricsStandardizer';
import { useIssuers } from '../hooks/useIssuers';
import StandardizerSkeleton from '../components/StandardizerSkeleton';

export default function Standardizer() {
    const { issuers, loading, error } = useIssuers();

    if (loading && issuers.length === 0) {
        return <StandardizerSkeleton />;
    }

    if (error && issuers.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center bg-red-900/10 p-8 rounded-2xl border border-red-900/20">
                    <div className="text-4xl mb-4">⚠️</div>
                    <h3 className="text-xl font-bold text-status-danger mb-2">Error de Conexión</h3>
                    <p className="text-text-secondary mb-4">{error.message}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-6 py-2 bg-status-danger text-white rounded-lg hover:bg-red-600 transition-colors"
                    >
                        Reintentar
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <MetricsStandardizer issuers={issuers} />
        </div>
    );
}
