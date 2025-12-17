import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import AIAnalysis from '../components/AIAnalysis';
import { fetchIssuers } from '../utils/marketDataApi';
import { transformIssuers } from '../utils/dataTransforms';

export default function AIAssistant() {
    const [searchParams] = useSearchParams();
    const initialIssuerId = searchParams.get('issuerId') || undefined;

    const [issuers, setIssuers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadIssuers() {
            try {
                console.log('[AIAssistant] Fetching issuers...');
                const data = await fetchIssuers();
                console.log('[AIAssistant] Issuers data:', data);

                // Transform issuers to match expected format
                const issuersList = transformIssuers(data.issuers);

                console.log('[AIAssistant] Transformed issuers list:', issuersList);
                console.log('[AIAssistant] Issuer count:', issuersList.length);

                setIssuers(issuersList);
            } catch (error) {
                console.error('[AIAssistant] Failed to load issuers:', error);
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
                    <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
                    <p className="text-slate-600">Cargando emisores...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <AIAnalysis issuers={issuers} initialIssuerId={initialIssuerId} />
        </div>
    );
}
