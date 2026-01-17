import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { ShieldCheckIcon, CubeTransparentIcon } from '@heroicons/react/24/outline';

export default function Login() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError(null);

        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
            navigate('/');
        } catch (err: any) {
            console.error("❌ Login FAILED", err);

            console.error('Login error details:', {
                code: err.code,
                message: err.message,
                fullError: err
            });
            // Show specific error for debugging
            const errorMessage = err.code
                ? `Error (${err.code}): ${err.message}`
                : 'Error al iniciar sesión con Google. Intenta nuevamente.';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent-primary/5 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/5 rounded-full blur-[100px]"></div>
            </div>

            <div className="w-full max-w-md bg-bg-elevated/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl relative animate-in fade-in zoom-in duration-500">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-accent-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-accent-primary/20 shadow-glow-cyan">
                        <CubeTransparentIcon className="w-8 h-8 text-accent-primary" />
                    </div>

                    <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">
                        Bienvenido a <span className="text-accent-primary">NicaBloomberg</span>
                    </h1>
                    <p className="text-text-secondary text-sm">
                        Plataforma de Inteligencia Financiera Avanzada
                    </p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-status-danger/10 border border-status-danger/20 rounded-xl text-status-danger text-xs font-mono">
                        {error}
                    </div>
                )}

                <div className="space-y-4">
                    <button
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        className="
                            w-full flex items-center justify-center gap-3 py-3.5 px-4 
                            bg-white text-black font-bold rounded-xl 
                            hover:bg-gray-100 transition-all duration-200 
                            hover:scale-[1.02] active:scale-[0.98]
                            disabled:opacity-50 disabled:cursor-wait
                        "
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                        ) : (
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    fill="#4285F4"
                                />
                                <path
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    fill="#34A853"
                                />
                                <path
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                    fill="#FBBC05"
                                />
                                <path
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                    fill="#EA4335"
                                />
                            </svg>
                        )}
                        <span>Continuar con Google</span>
                    </button>

                    <div className="relative flex items-center my-6">
                        <div className="flex-grow border-t border-white/10"></div>
                        <span className="flex-shrink-0 mx-4 text-text-tertiary text-xs uppercase tracking-widest">Acceso Seguro</span>
                        <div className="flex-grow border-t border-white/10"></div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-center">
                        <div className="p-3 rounded-lg bg-black/20 border border-white/5">
                            <ShieldCheckIcon className="w-5 h-5 text-accent-secondary mx-auto mb-2" />
                            <span className="text-[10px] text-text-tertiary block">Encriptación TLS</span>
                        </div>
                        <div className="p-3 rounded-lg bg-black/20 border border-white/5">
                            <div className="w-5 h-5 rounded-full bg-status-success/20 border border-status-success/50 mx-auto mb-2 flex items-center justify-center">
                                <span className="w-1.5 h-1.5 rounded-full bg-status-success"></span>
                            </div>
                            <span className="text-[10px] text-text-tertiary block">Sistema Activo</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Add these colors to tailwind config if not present, but they seem to be based on file view
