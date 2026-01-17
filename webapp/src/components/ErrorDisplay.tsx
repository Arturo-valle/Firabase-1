import { ArrowPathIcon, SignalSlashIcon } from '@heroicons/react/24/outline';

interface ErrorDisplayProps {
    error: Error;
    onRetry?: () => void;
    retryLabel?: string;
    isRetrying?: boolean;
}

/**
 * "Obsidian Standard" System Diagnostics Screen
 * Replaces the generic error page with a professional terminal-style status check.
 */
export function ErrorDisplay({
    error,
    onRetry,
    retryLabel = 'INITIATE_RECONNECT',
    isRetrying = false
}: ErrorDisplayProps) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-bg-primary relative overflow-hidden">
            {/* Ambient Background Glow (Subtle) */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-accent-primary/5 blur-[120px] rounded-full pointer-events-none" />

            {/* Main Diagnostics Card */}
            <div className="relative z-10 glass-panel border border-border-subtle p-px max-w-lg w-full mx-4 shadow-2xl">
                <div className="bg-bg-secondary/95 backdrop-blur-xl rounded-2xl p-8 border border-white/5">

                    {/* Header: Terminal Style */}
                    <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full bg-status-danger animate-pulse" />
                            <span className="font-mono text-xs text-text-tertiary tracking-widest uppercase">
                                SYSTEM_DIAGNOSTICS :: <span className="text-status-danger">CRITICAL_FAILURE</span>
                            </span>
                        </div>
                        <span className="font-mono text-xs text-text-muted">ERR_0x5F</span>
                    </div>

                    {/* Visual Error Representation */}
                    <div className="mb-8 flex flex-col items-center">
                        <div className="w-20 h-20 rounded-2xl bg-bg-tertiary border border-white/5 flex items-center justify-center mb-6 relative">
                            {/* Animated Rings */}
                            {isRetrying && (
                                <div className="absolute inset-0 border border-accent-primary/30 rounded-2xl animate-ping" />
                            )}
                            <SignalSlashIcon className="w-8 h-8 text-status-danger" />
                        </div>

                        <h2 className="text-2xl font-bold text-text-primary mb-2 tracking-tight">
                            Connection Terminated
                        </h2>
                        <div className="font-mono text-xs text-status-danger bg-status-danger/10 px-3 py-1 rounded border border-status-danger/20">
                            {error.message || 'UPSTREAM_TIMEOUT'}
                        </div>
                    </div>

                    {/* Diagnostic Log "Fake" */}
                    <div className="bg-black/50 rounded-lg p-4 font-mono text-xs mb-8 border border-white/5 overflow-hidden">
                        <div className="space-y-1 text-text-tertiary">
                            <p>&gt; Initiating handshake sequence...</p>
                            <p>&gt; Ping external gateway: <span className="text-status-danger">TIMEOUT</span></p>
                            <p>&gt; Verifying local integrity: <span className="text-status-success">OK</span></p>
                            <p>&gt; <span className="animate-pulse">_</span></p>
                        </div>
                    </div>

                    {/* Action Area */}
                    {onRetry && (
                        <button
                            onClick={onRetry}
                            disabled={isRetrying}
                            className={`
                                w-full group relative overflow-hidden rounded-xl p-px
                                transition-all duration-300
                                ${isRetrying ? 'cursor-wait opacity-80' : 'hover:scale-[1.02]'}
                            `}
                        >
                            {/* Gradient Border */}
                            <div className="absolute inset-0 bg-gradient-to-r from-accent-primary via-accent-secondary to-accent-primary opacity-20 group-hover:opacity-100 transition-opacity duration-500" />

                            {/* Button Content */}
                            <div className="relative bg-bg-tertiary hover:bg-bg-elevated text-text-primary px-6 py-3 rounded-xl flex items-center justify-center gap-3 transition-colors border border-white/5">
                                <ArrowPathIcon className={`w-4 h-4 ${isRetrying ? 'animate-spin' : 'text-accent-primary'}`} />
                                <span className="font-mono text-sm font-bold tracking-wide">
                                    {isRetrying ? 'ESTABLISHING_LINK...' : retryLabel}
                                </span>
                            </div>
                        </button>
                    )}

                    <div className="mt-6 text-center">
                        <p className="text-[10px] text-text-muted uppercase tracking-widest">
                            CentraCapital Terminal v2.1.0 // SECURE LINK
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ErrorDisplay;
