import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
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
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold text-text-primary">La Bóveda Inteligente</h2>
                <div className="relative w-64">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                    <input
                        type="text"
                        placeholder="Buscar emisor..."
                        className="input w-full pl-9"
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {issuers.length === 0 ? (
                <div className="p-4 text-center text-text-secondary">No hay emisores disponibles.</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredIssuers.map((issuer) => (
                        <Link
                            key={issuer.id}
                            to={`/issuer/${encodeURIComponent(issuer.id)}`}
                            className="group bg-bg-secondary border border-border-subtle hover:border-accent-primary/50 p-5 rounded-xl cursor-pointer transition-all duration-200 hover:shadow-glow hover:-translate-y-1 block"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="w-10 h-10 bg-white rounded-lg p-1 flex items-center justify-center">
                                    <img src={issuer.logoUrl || 'https://www.bolsanic.com/wp-content/uploads/2016/12/logo.png'} alt="logo" className="max-w-full max-h-full object-contain" />
                                </div>
                                {issuer.acronym && (
                                    <span className="text-xs font-mono text-text-tertiary bg-bg-tertiary px-2 py-1 rounded">{issuer.acronym}</span>
                                )}
                            </div>
                            <h3 className="text-lg font-bold text-text-primary group-hover:text-accent-primary transition-colors">{issuer.name}</h3>
                            <p className="text-sm text-text-secondary mt-1">{issuer.sector || 'Sector Privado'}</p>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
};

export default VaultModule;

