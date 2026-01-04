import { useState, useEffect } from 'react';
import { useIssuers } from './useIssuers';
import { calculateMarketStats } from '../utils/marketDataApi';
import type { FinanceIssuerViewModel, MarketStats } from '../types';

export function useFinanceData() {
    const { issuers: rawIssuers, loading, error } = useIssuers();
    const [issuers, setIssuers] = useState<FinanceIssuerViewModel[]>([]);
    const [stats, setStats] = useState<MarketStats | null>(null);

    useEffect(() => {
        if (!loading && rawIssuers.length > 0) {
            const viewModels: FinanceIssuerViewModel[] = rawIssuers
                .map(issuer => ({
                    ...issuer,
                    processed: issuer.documents.length,
                    total: issuer.documents.length,
                    coverage: 100,
                    lastProcessed: new Date(), // TODO: Backend should provide actual last processed date
                    documents: issuer.documents
                }));

            const marketStats = calculateMarketStats(viewModels);

            setIssuers(viewModels.sort((a, b) => b.processed - a.processed));
            setStats({
                totalIssuers: viewModels.length,
                totalProcessedDocs: marketStats.totalProcessedDocs,
                totalChunks: marketStats.totalChunks,
                overallCoverage: marketStats.overallCoverage
            });
        }
    }, [rawIssuers, loading]);

    return { issuers, stats, loading, error };
}
