import { InboxIcon } from '@heroicons/react/24/outline';

interface EmptyStateProps {
    /** Mensaje principal a mostrar */
    message?: string;
    /** Descripción secundaria opcional */
    description?: string;
}

/**
 * Componente para mostrar estado vacío cuando no hay datos.
 * Diseño consistente con la estética del Terminal de Mercado.
 */
export function EmptyState({
    message = 'No hay datos disponibles',
    description
}: EmptyStateProps) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-bg-primary">
            <div className="text-center max-w-md mx-auto p-8">
                {/* Icono de vacío */}
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-text-muted/20 flex items-center justify-center">
                    <InboxIcon className="w-8 h-8 text-text-muted" />
                </div>

                {/* Mensaje principal */}
                <h2 className="text-xl font-semibold text-text-primary mb-2">
                    {message}
                </h2>

                {/* Descripción opcional */}
                {description && (
                    <p className="text-text-secondary font-mono text-sm">
                        {description}
                    </p>
                )}
            </div>
        </div>
    );
}

export default EmptyState;
