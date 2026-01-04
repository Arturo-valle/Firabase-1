import { useParams, useNavigate } from 'react-router-dom';
import { useIssuerData } from '../hooks/useIssuerData';
import IssuerDetailView from '../components/IssuerDetailView';

export default function IssuerDetail() {
    const { issuerId } = useParams<{ issuerId: string }>();
    const navigate = useNavigate();
    const { issuer, metrics, history, loading, error } = useIssuerData(issuerId);

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
                <p>{error || "No se pudo cargar la información del emisor."}</p>
                <button
                    onClick={() => navigate('/')}
                    className="mt-4 px-4 py-2 bg-bg-elevated rounded hover:bg-bg-tertiary transition-colors font-mono"
                >
                    Volver al Inicio
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-bg-primary p-6">
            <IssuerDetailView
                issuer={issuer}
                metrics={metrics}
                history={history}
                onBack={() => navigate('/')}
            />
        </div>
    );
}
