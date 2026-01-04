import React from 'react';

interface LoadingSpinnerProps {
    message?: string;
    fullScreen?: boolean;
}

/**
 * Componente de carga premium con estética de terminal.
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
    message = 'Procesando...',
    fullScreen = false
}) => {
    const content = (
        <div className="text-center">
            <div className="relative w-16 h-16 mx-auto mb-6">
                {/* Capa exterior - Giro lento */}
                <div className="absolute inset-0 border-4 border-accent-primary/20 rounded-full animate-pulse-slow"></div>
                {/* Capa media - Giro rápido */}
                <div className="absolute inset-0 border-4 border-accent-primary border-t-transparent rounded-full animate-spin"></div>
                {/* Capa interior - Efecto glow */}
                <div className="absolute inset-2 bg-accent-primary/10 rounded-full blur-sm"></div>
            </div>
            <p className="text-text-secondary font-mono text-sm tracking-widest animate-pulse">
                {message}
            </p>
        </div>
    );

    if (fullScreen) {
        return (
            <div className="fixed inset-0 bg-bg-primary/80 backdrop-blur-sm flex items-center justify-center z-50">
                {content}
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-[400px]">
            {content}
        </div>
    );
};

export default LoadingSpinner;
