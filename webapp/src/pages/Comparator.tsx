import { useState, useEffect } from 'react';
import IssuerComparator from '../components/IssuerComparator';
import { fetchIssuers } from '../utils/marketDataApi';
import type { Issuer } from '../types';

export default function Comparator() {
    const [issuers, setIssuers] = useState<Issuer[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadIssuers() {
            try {
                const data = await fetchIssuers();
                setIssuers(data.issuers || []);
            } catch (error) {
                console.error('Failed to load issuers for comparator:', error);
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
                    <p className="text-text-secondary">Cargando comparador...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <IssuerComparator issuers={issuers} />
        </div>
    );
}
