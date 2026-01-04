import { useSearchParams } from 'react-router-dom';
import AIAnalysis from '../components/AIAnalysis';
import { useIssuers } from '../hooks/useIssuers';
import { ErrorDisplay } from '../components/ErrorDisplay';
import { LoadingSpinner } from '../components/LoadingSpinner';

export default function AIAssistant() {
    const [searchParams] = useSearchParams();
    const initialIssuerId = searchParams.get('issuerId') || undefined;

    // Use the refactored hook with built-in retry logic
    const { issuers, loading, error, retry, isRetrying } = useIssuers({
        retries: 3
    });

    if (loading) {
        return <LoadingSpinner message="Cargando ecosistema de emisores..." />;
    }

    if (error) {
        return (
            <ErrorDisplay
                error={error}
                onRetry={retry}
                isRetrying={isRetrying}
            />
        );
    }

    // Validate if initialIssuerId exists in the loaded list
    const validIssuerId = issuers.some(i => i.id === initialIssuerId) ? initialIssuerId : undefined;

    return (
        <div className="space-y-6">
            <AIAnalysis issuers={issuers} initialIssuerId={validIssuerId} />
        </div>
    );
}
