import { useState, useEffect } from 'react';
import VaultModule from '../components/VaultModule';
import { fetchIssuers } from '../utils/marketDataApi';
import type { Issuer } from '../types';

export default function Library() {
    const [issuers, setIssuers] = useState<Issuer[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadIssuers() {
            try {
                const data = await fetchIssuers();
                // Transform processedIssuers to match Issuer type
                const issuersList = data.issuers?.map((issuer: any) => ({
                    id: issuer.id,
                    name: issuer.name,
                    sector: issuer.sector || 'Privado',
                    acronym: issuer.acronym || '',
                    documents: issuer.documents || [],
                    logoUrl: issuer.logoUrl || '',
                })) || [];
                setIssuers(issuersList);
            } catch (error) {
                console.error('Failed to load issuers for library:', error);
            } finally {
                setLoading(false);
            }
        }
        loadIssuers();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="animate-spin w-12 h-12 border-4 border-accent-primary border-t-transparent rounded-full mx-auto mb-4" />
                    <p className="text-text-secondary">Cargando biblioteca...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <VaultModule issuers={issuers} />
        </div>
    );
}
