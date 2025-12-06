import React, { useState, useEffect } from 'react';

interface Space {
    id: string;
    name: string;
    description: string;
    icon: string;
    documentCount: number;
    updatedAt: string;
}

const DEFAULT_SPACES: Space[] = [
    {
        id: '1',
        name: 'Análisis Bancario 2023',
        description: 'Colección de estados financieros y reportes de riesgo de los principales bancos nacionales.',
        icon: '🏦',
        documentCount: 12,
        updatedAt: 'Hace 2 días'
    },
    {
        id: '2',
        name: 'Sector Energía',
        description: 'Seguimiento de emisores del sector energético y renovables.',
        icon: '⚡️',
        documentCount: 5,
        updatedAt: 'Hace 1 semana'
    }
];

const SpacesModule: React.FC = () => {
    const [spaces, setSpaces] = useState<Space[]>(() => {
        const saved = localStorage.getItem('perplexity_spaces');
        return saved ? JSON.parse(saved) : DEFAULT_SPACES;
    });

    useEffect(() => {
        localStorage.setItem('perplexity_spaces', JSON.stringify(spaces));
    }, [spaces]);

    const handleCreateSpace = () => {
        const name = prompt('Nombre del nuevo espacio:');
        if (!name) return;

        const newSpace: Space = {
            id: Date.now().toString(),
            name,
            description: 'Nuevo espacio de trabajo',
            icon: '📁',
            documentCount: 0,
            updatedAt: 'Justo ahora'
        };

        setSpaces([newSpace, ...spaces]);
    };

    const handleDeleteSpace = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('¿Estás seguro de eliminar este espacio?')) {
            setSpaces(spaces.filter(s => s.id !== id));
        }
    };

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-text-primary">Mis Espacios</h1>
                    <p className="text-text-secondary mt-1">Organiza tus investigaciones y documentos</p>
                </div>
                <button
                    onClick={handleCreateSpace}
                    className="btn-primary flex items-center gap-2"
                >
                    <span className="text-xl">+</span>
                    Nuevo Espacio
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Create New Card */}
                <div
                    onClick={handleCreateSpace}
                    className="card border-dashed border-2 border-border-subtle bg-transparent hover:border-accent-primary/50 hover:bg-bg-tertiary/50 transition-all cursor-pointer flex flex-col items-center justify-center p-12 text-center group min-h-[200px]"
                >
                    <div className="w-16 h-16 rounded-full bg-bg-tertiary flex items-center justify-center mb-4 group-hover:bg-accent-primary/20 transition-colors">
                        <span className="text-3xl text-text-tertiary group-hover:text-accent-primary transition-colors">+</span>
                    </div>
                    <h3 className="text-lg font-bold text-text-primary">Crear Espacio</h3>
                    <p className="text-text-secondary text-sm mt-2">Inicia una nueva colección</p>
                </div>

                {/* Spaces List */}
                {spaces.map((space) => (
                    <div key={space.id} className="card hover:border-accent-primary/50 transition-colors cursor-pointer group flex flex-col">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-12 h-12 rounded-lg bg-bg-tertiary flex items-center justify-center text-2xl">
                                {space.icon}
                            </div>
                            <button
                                onClick={(e) => handleDeleteSpace(space.id, e)}
                                className="text-text-tertiary hover:text-status-danger opacity-0 group-hover:opacity-100 transition-opacity p-1"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                </svg>
                            </button>
                        </div>
                        <h3 className="text-lg font-bold text-text-primary mb-2">{space.name}</h3>
                        <p className="text-text-secondary text-sm mb-4 flex-1">
                            {space.description}
                        </p>
                        <div className="flex items-center justify-between text-xs text-text-tertiary border-t border-border-subtle pt-4 mt-auto">
                            <span>{space.documentCount} documentos</span>
                            <span>{space.updatedAt}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SpacesModule;
