import { useEffect } from 'react';
import { useIssuers } from '../hooks/useIssuers';
import VaultModule from '../components/VaultModule';
import ErrorDisplay from '../components/ErrorDisplay';
import LibrarySkeleton from '../components/LibrarySkeleton';

export default function Library() {
    const { issuers, loading, error, refresh } = useIssuers();

    // SEO Dynamic Title
    useEffect(() => {
        document.title = "Biblioteca | Antigravity AI";
    }, []);

    if (loading) {
        return <LibrarySkeleton />;
    }

    if (error) {
        return (
            <div className="p-6">
                <ErrorDisplay
                    error={error}
                    onRetry={refresh}
                />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <VaultModule issuers={issuers} />
        </div>
    );
}
