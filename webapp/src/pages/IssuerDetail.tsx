import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchIssuerDetail } from '../utils/marketDataApi';
import { transformIssuers } from '../utils/dataTransforms';
import type { Issuer } from '../types';
import IssuerDetailView from '../components/IssuerDetailView';

export default function IssuerDetail() {
    const { issuerId } = useParams<{ issuerId: string }>();
    const navigate = useNavigate();
    const [issuer, setIssuer] = useState<Issuer | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!issuerId) return;

        async function loadIssuerData() {
            setLoading(true);
            try {
                const data = await fetchIssuerDetail(issuerId!);
                // Transform to Issuer type
                // Transform to Issuer type using shared utility
                const transformed = transformIssuers([data]);
                const issuerObj = transformed[0] || {
                    // Fallback if transform fails (shouldn't happen for valid data)
                    ...data,
                    documents: data.documents || []
                };
                setIssuer(issuerObj);
            } catch (err: any) {
                console.error("Failed to load issuer detail:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }
        loadIssuerData();
    }, [issuerId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-bg-primary">
                <div className="animate-spin w-12 h-12 border-4 border-accent-primary border-t-transparent rounded-full" />
            </div>
        );
    }

    if (error || !issuer) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-bg-primary text-text-secondary">
                <p>No se pudo cargar la información del emisor.</p>
                <button
                    onClick={() => navigate('/')}
                    className="mt-4 px-4 py-2 bg-bg-elevated rounded hover:bg-bg-tertiary transition-colors"
                >
                    Volver al Inicio
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-bg-primary p-6">
            <IssuerDetailView issuer={issuer} onBack={() => navigate('/')} />
        </div>
    );
}
