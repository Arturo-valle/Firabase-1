import { ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface ErrorDisplayProps {
    /** El error a mostrar */
    error: Error;
    /** Callback para reintentar la operación */
    onRetry?: () => void;
    /** Texto personalizado del botón de retry */
    retryLabel?: string;
    /** Si está en proceso de reintento */
    isRetrying?: boolean;
}

/**
 * Componente para mostrar errores de carga con opción de reintentar.
 * Diseño consistente con la estética del Terminal de Mercado.
 */
export function ErrorDisplay({
    error,
    onRetry,
    retryLabel = 'Reintentar',
    isRetrying = false
}: ErrorDisplayProps) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-bg-primary">
            <div className="text-center max-w-md mx-auto p-8">
                {/* Icono de error */}
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                    <ExclamationTriangleIcon className="w-8 h-8 text-red-500" />
                </div>

                {/* Título */}
                <h2 className="text-xl font-semibold text-text-primary mb-2">
                    Error de Conexión
                </h2>

                {/* Mensaje de error */}
                <p className="text-text-secondary mb-6 font-mono text-sm">
                    {error.message || 'No se pudo conectar con el servidor'}
                </p>

                {/* Botón de reintentar */}
                {onRetry && (
                    <button
                        onClick={onRetry}
                        disabled={isRetrying}
                        className={`
              inline-flex items-center gap-2 px-6 py-3 rounded-lg
              font-medium transition-all duration-200
              ${isRetrying
                                ? 'bg-accent-primary/50 cursor-not-allowed'
                                : 'bg-accent-primary hover:bg-accent-primary/80 hover:scale-105'
                            }
              text-bg-primary
            `}
                    >
                        <ArrowPathIcon
                            className={`w-5 h-5 ${isRetrying ? 'animate-spin' : ''}`}
                        />
                        {isRetrying ? 'Reintentando...' : retryLabel}
                    </button>
                )}

                {/* Información adicional */}
                <p className="mt-6 text-text-muted text-xs">
                    Si el problema persiste, verifica tu conexión a internet
                </p>
            </div>
        </div>
    );
}

export default ErrorDisplay;
