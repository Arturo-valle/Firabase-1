import React, { useState } from 'react';
import type { Issuer } from '../types';

interface DiscoverModuleProps {
    issuers: Issuer[];
}

const DiscoverModule: React.FC<DiscoverModuleProps> = ({ issuers }) => {
    const [filter, setFilter] = useState<'all' | 'news' | 'reports'>('all');

    // Flatten all documents and add issuer context
    const allItems = issuers.flatMap(issuer =>
        (issuer.documents || []).map(doc => ({
            ...doc,
            issuerName: issuer.name,
            issuerLogo: issuer.logoUrl
        }))
    );

    // Filter items
    const filteredItems = allItems.filter(item => {
        if (filter === 'all') return true;
        if (filter === 'news') return item.type === 'Hecho Relevante';
        if (filter === 'reports') return item.type !== 'Hecho Relevante'; // Assuming others are reports
        return true;
    });

    // Sort by date (mock sort for now as date format might vary)
    // In a real app, parse `item.date`
    const sortedItems = filteredItems.slice(0, 12); // Show top 12

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-text-primary">Descubrir</h1>
                <div className="flex gap-2">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-4 py-2 rounded-full transition-colors text-sm font-medium ${filter === 'all' ? 'bg-bg-elevated text-accent-primary border border-accent-primary/30' : 'bg-bg-tertiary text-text-secondary hover:bg-bg-elevated hover:text-text-primary'}`}
                    >
                        Todo
                    </button>
                    <button
                        onClick={() => setFilter('news')}
                        className={`px-4 py-2 rounded-full transition-colors text-sm font-medium ${filter === 'news' ? 'bg-bg-elevated text-accent-primary border border-accent-primary/30' : 'bg-bg-tertiary text-text-secondary hover:bg-bg-elevated hover:text-text-primary'}`}
                    >
                        Hechos Relevantes
                    </button>
                    <button
                        onClick={() => setFilter('reports')}
                        className={`px-4 py-2 rounded-full transition-colors text-sm font-medium ${filter === 'reports' ? 'bg-bg-elevated text-accent-primary border border-accent-primary/30' : 'bg-bg-tertiary text-text-secondary hover:bg-bg-elevated hover:text-text-primary'}`}
                    >
                        Informes
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sortedItems.map((item, index) => (
                    <div key={index} className="card group cursor-pointer hover:border-accent-primary/50 transition-all hover:-translate-y-1 flex flex-col h-full">
                        <div className="h-40 bg-bg-tertiary rounded-t-xl mb-4 relative overflow-hidden flex-shrink-0">
                            <div className="absolute inset-0 bg-gradient-to-t from-bg-secondary to-transparent opacity-60"></div>
                            {item.issuerLogo && (
                                <img src={item.issuerLogo} alt={item.issuerName} className="absolute top-4 right-4 w-12 h-12 object-contain bg-white rounded-full p-1" />
                            )}
                            <div className="absolute bottom-4 left-4">
                                <span className="px-2 py-1 bg-accent-primary/20 text-accent-primary text-xs rounded-md font-bold uppercase tracking-wider">
                                    {item.type || 'Documento'}
                                </span>
                            </div>
                        </div>
                        <div className="p-4 pt-0 flex-1 flex flex-col">
                            <h3 className="text-lg font-bold text-text-primary mb-2 group-hover:text-accent-primary transition-colors line-clamp-2">
                                {item.title}
                            </h3>
                            <p className="text-text-secondary text-sm line-clamp-3 mb-4 flex-1">
                                {item.issuerName}
                            </p>
                            <div className="mt-auto flex items-center gap-2 text-xs text-text-tertiary border-t border-border-subtle pt-3">
                                <span>{item.date || 'Fecha desconocida'}</span>
                                {item.url && (
                                    <>
                                        <span>•</span>
                                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="hover:text-accent-primary">Ver Documento ↗</a>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DiscoverModule;
