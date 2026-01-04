import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null
    };

    public static getDerivedStateFromError(error: Error): State {
        // Actualiza el estado para que el siguiente renderizado muestre la UI alternativa
        return { hasError: true, error, errorInfo: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({
            error: error,
            errorInfo: errorInfo
        });
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
                    <div className="max-w-2xl w-full bg-gray-800 p-8 rounded-lg shadow-xl border border-red-500">
                        <h1 className="text-3xl font-bold text-red-500 mb-4">Algo salió mal</h1>
                        <p className="text-gray-300 mb-6">
                            Se ha producido un error crítico en la aplicación. Por favor, recarga la página o contacta al soporte si el problema persiste.
                        </p>

                        {this.state.error && (
                            <div className="bg-black p-4 rounded overflow-auto mb-6 max-h-60">
                                <p className="font-mono text-red-400 font-bold mb-2">Error: {this.state.error.toString()}</p>
                                {this.state.errorInfo && (
                                    <pre className="font-mono text-xs text-gray-500 whitespace-pre-wrap">
                                        {this.state.errorInfo.componentStack}
                                    </pre>
                                )}
                            </div>
                        )}

                        <button
                            onClick={() => window.location.reload()}
                            className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded transition duration-200"
                        >
                            Recargar Página
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
