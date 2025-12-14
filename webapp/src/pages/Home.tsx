import { useState, useEffect } from 'react';
import { fetchIssuers, DISPLAY_NAMES, ISSUER_METADATA } from '../utils/marketDataApi';
import type { Issuer } from '../types';
import FinancialDashboard from '../components/FinancialDashboard';

export default function Home() {
    const [issuers, setIssuers] = useState<Issuer[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch real data on mount
    useEffect(() => {
        async function loadData() {
            try {
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
                    <p className="text-accent-primary font-mono animate-pulse">Cargando Terminal...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-bg-primary p-6">
            <FinancialDashboard issuers={issuers} />
        </div>
    );
}
