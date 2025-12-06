import AINewsFeed from '../components/ai/AINewsFeed';
import SmartSearch from '../components/ai/SmartSearch';

export default function Research() {
    return (
        <div className="space-y-6 animate-fade-in">
            {/* Page Header */}
            <div>
                <h2 className="text-3xl font-bold text-text-primary mb-2">
                    🔬 Centro de Investigación AI
                </h2>
                <p className="text-text-secondary">
                    Herramientas avanzadas de análisis financiero potenciadas por inteligencia artificial
                </p>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Smart Search */}
                <div className="lg:col-span-2">
                    <SmartSearch />
                </div>

                {/* AI News Feed */}
                <div className="lg:col-span-2">
                    <AINewsFeed />
                </div>
            </div>

            {/* Info Banner */}
            <div className="card bg-accent-primary/10 border border-accent-primary/20">
                <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 text-4xl">✨</div>
                    <div className="flex-1">
                        <h4 className="text-text-primary font-semibold mb-2">
                            Powered by Gemini 2.0 Flash
                        </h4>
                        <p className="text-text-secondary text-sm mb-3">
                            Nuestro sistema de IA analiza documentos financieros auditados para generar insights,
                            noticias y respuestas basadas en datos verificados del mercado nicaragüense.
                        </p>
                        <div className="flex gap-4 text-xs">
                            <div>
                                <span className="text-text-tertiary">Precisión:</span>
                                <span className="text-accent-primary font-semibold ml-1">95%+</span>
                            </div>
                            <div>
                                <span className="text-text-tertiary">Fuentes:</span>
                                <span className="text-accent-primary font-semibold ml-1">Documentos Auditados</span>
                            </div>
                            <div>
                                <span className="text-text-tertiary">Idioma:</span>
                                <span className="text-accent-primary font-semibold ml-1">Español</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
