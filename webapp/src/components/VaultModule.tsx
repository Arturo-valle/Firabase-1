import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MagnifyingGlassIcon, BuildingLibraryIcon, GlobeAmericasIcon } from '@heroicons/react/24/outline';
import type { Issuer } from '../types';

interface VaultModuleProps {
    issuers?: Issuer[];
}

const VaultModule: React.FC<VaultModuleProps> = ({ issuers = [] }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredIssuers = issuers.filter((issuer) =>
        issuer.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-fade-in p-6">
            {/* Hero Search Section */}
            <div className="relative glass-panel rounded-2xl p-8 overflow-hidden text-center">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-32 bg-accent-primary/20 blur-[100px] rounded-full pointer-events-none" />

                <h2 className="relative z-10 text-3xl font-bold text-white mb-2 tracking-tight">
                    Bóveda de Inteligencia
                </h2>
                <p className="relative z-10 text-text-secondary mb-8 max-w-lg mx-auto text-sm">
                    Acceda a perfiles financieros, reportes de riesgo y hechos relevantes de todos los emisores activos.
                </p>

                <div className="relative z-10 max-w-xl mx-auto group">
                    <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary group-focus-within:text-accent-primary transition-colors" />
                    <input
                        type="text"
                        placeholder="Buscar emisor por nombre o símbolo..."
                        className="
                            w-full pl-12 pr-4 py-4 bg-black/60 border border-white/10 rounded-xl
                            text-white placeholder:text-text-tertiary text-lg font-medium
                            focus:outline-none focus:border-accent-primary/50 focus:ring-1 focus:ring-accent-primary/50
                            transition-all shadow-lg
                        "
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Grid */}
            {issuers.length === 0 ? (
                <div className="text-center py-20 opacity-50">
                    <BuildingLibraryIcon className="w-16 h-16 mx-auto mb-4 text-text-tertiary px-4 py-2" />
                    <p className="text-text-secondary">No data available.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {filteredIssuers.map((issuer) => (
                        <Link
                            key={issuer.id}
                            to={`/issuer/${encodeURIComponent(issuer.id)}`}
                            className="
                                group relative bg-black/40 border border-white/5 hover:border-accent-primary/50 
                                p-5 rounded-xl cursor-pointer transition-all duration-300 
                                hover:shadow-glow-blue hover:-translate-y-1 overflow-hidden
                            "
                        >
                            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-white/5 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity" />

                            <div className="flex justify-between items-start mb-4 relative z-10">
                                <div className="w-12 h-12 bg-white rounded-lg p-2 flex items-center justify-center shadow-inner">
                                    <img
                                        src={issuer.logoUrl || 'https://www.bolsanic.com/wp-content/uploads/2016/12/logo.png'}
                                        alt="logo"
                                        className="max-w-full max-h-full object-contain filter contrast-125"
                                    />
                                </div>
                                {issuer.acronym && (
                                    <span className="text-[10px] font-mono font-bold text-accent-primary bg-accent-primary/10 border border-accent-primary/20 px-2 py-1 rounded">
                                        {issuer.acronym}
                                    </span>
                                )}
                            </div>

                            <h3 className="text-lg font-bold text-white group-hover:text-accent-primary transition-colors line-clamp-1 mb-1">
                                {issuer.name}
                            </h3>

                            <div className="flex items-center gap-2 text-xs text-text-secondary mb-4">
                                <GlobeAmericasIcon className="w-3 h-3" />
                                <span>{issuer.sector || 'Corporativo'}</span>
                            </div>

                            <div className="pt-4 border-t border-white/5 flex justify-between items-center text-xs">
                                <span className="text-text-tertiary font-mono">
                                    {issuer.documents?.length || 0} RECS
                                </span>
                                <span className="flex items-center gap-1 text-accent-secondary opacity-0 group-hover:opacity-100 transition-opacity font-bold">
                                    ACCESS →
                                </span>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
};

export default VaultModule;
