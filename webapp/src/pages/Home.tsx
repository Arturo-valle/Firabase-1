import { useEffect } from 'react';
import FinancialDashboard from '../components/FinancialDashboard';
import { ErrorDisplay } from '../components/ErrorDisplay';
import { EmptyState } from '../components/EmptyState';
import { useIssuers } from '../hooks/useIssuers';
import { DashboardSkeleton } from '../components/DashboardSkeleton';

/**
 * Página principal del Terminal de Mercado.
 * Carga los emisores y muestra el dashboard financiero.
 */
export default function Home() {
    const { issuers, loading, error, retry, isRetrying } = useIssuers({
        timeout: 30000,
        retries: 2
    });

    // Título dinámico para SEO
    useEffect(() => {
        document.title = "Terminal de Mercado | Bolsa de Valores de Nicaragua";
    }, []);

    // Estado de carga elegante (Skeleton)
    if (loading) {
        return <DashboardSkeleton />;
    }

    // Estado de error
    if (error) {
        return (
            <ErrorDisplay
                error={error}
                onRetry={retry}
                isRetrying={isRetrying}
            />
        );
    }

    // Estado vacío
    if (issuers.length === 0) {
        return (
            <EmptyState
                message="No hay emisores disponibles"
                description="Verifica que el sistema esté procesando datos correctamente"
            />
        );
    }

    // Estado normal: mostrar dashboard
    return (
        <div className="min-h-screen bg-bg-primary p-6">
            <FinancialDashboard issuers={issuers} />
        </div>
    );
}
