import React from 'react';
import type { Issuer } from '../types';
import { SparklesIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

interface HomeModuleProps {
    issuers: Issuer[];
}

const HomeModule: React.FC<HomeModuleProps> = ({ issuers: _issuers }) => {
    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] text-center space-y-8 animate-fade-in max-w-4xl mx-auto">

            <div className="space-y-6">
                <h1 className="text-4xl md:text-5xl font-bold text-text-primary tracking-tight font-serif">
                    Where knowledge begins
                </h1>
                <p className="text-xl text-text-secondary max-w-2xl mx-auto">
                    Explora el Mercado de Valores de Nicaragua con el poder de la Inteligencia Artificial.
                </p>
            </div>

            {/* Main Search Input (Visual Only) */}
            <div className="w-full max-w-2xl relative group">
                <div className="absolute inset-0 bg-accent-primary/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative bg-bg-secondary border border-border-subtle rounded-full p-2 pl-6 flex items-center shadow-lg hover:border-border-emphasis transition-all">
                    <input
                        type="text"
                        placeholder="Ask anything..."
                        className="flex-1 bg-transparent border-none focus:ring-0 text-lg text-text-primary placeholder-text-tertiary"
                    />
                    <button className="p-2 bg-bg-tertiary hover:bg-bg-elevated rounded-full text-text-secondary hover:text-text-primary transition-colors">
                        <ArrowRightIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Quick Suggestions */}
            <div className="flex flex-wrap justify-center gap-3 text-sm text-text-secondary">
                <button className="px-4 py-2 bg-bg-secondary border border-border-subtle rounded-full hover:bg-bg-tertiary hover:text-text-primary transition-colors flex items-center gap-2">
                    <SparklesIcon className="w-4 h-4 text-accent-primary" />
                    Analizar reporte de Keysight
                </button>
                <button className="px-4 py-2 bg-bg-secondary border border-border-subtle rounded-full hover:bg-bg-tertiary hover:text-text-primary transition-colors">
                    Ver últimos hechos relevantes
                </button>
                <button className="px-4 py-2 bg-bg-secondary border border-border-subtle rounded-full hover:bg-bg-tertiary hover:text-text-primary transition-colors">
                    Comparar emisores bancarios
                </button>
            </div>

            {/* Footer Info */}
            <div className="mt-12 text-xs text-text-tertiary">
                <p>Powered by Perplexity Finance Engine • Nicaragua Markets Edition</p>
            </div>
        </div>
    );
};

export default HomeModule;
