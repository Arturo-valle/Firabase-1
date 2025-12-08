import React, { useState, useEffect } from 'react';
import type { Issuer, Document } from '../types';
import { formatDate } from '../utils/formatters';

// --- Funciones de Ayuda ---
const groupDocumentsByCategory = (documents: Document[]) => {
    return documents.reduce((acc, doc) => {
        const category = doc.type || 'Otros';
        (acc[category] = acc[category] || []).push(doc);
        return acc;
    }, {} as Record<string, Document[]>);
};

interface IssuerDetailViewProps {
    issuer: Issuer;
    onBack: () => void;
}

const IssuerDetailView: React.FC<IssuerDetailViewProps> = ({ issuer, onBack }) => {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchDocuments = async () => {
            if (!issuer || !issuer.name) {
                setError('Información del emisor inválida.');
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);
                setDocuments(issuer.documents || []);
            } catch (e) {
                setError(e instanceof Error ? e.message : 'Ocurrió un error desconocido al cargar los documentos.');
                console.error(e);
            } finally {
                setLoading(false);
            }
        };

        fetchDocuments();
    }, [issuer]);

    const groupedDocuments = groupDocumentsByCategory(documents);
    const FALLBACK_LOGO_URL = 'https://www.bolsanic.com/wp-content/uploads/2016/12/logo.png';

    return (
        <div className="card animate-fade-in">
            <button onClick={onBack} className="mb-4 text-sm font-medium text-accent-secondary hover:text-accent-hover transition-colors">{'‹ Volver a la Lista'}</button>
            <div className="flex items-center mb-6">
                <div className="h-16 w-16 bg-white rounded-full p-2 mr-4 flex items-center justify-center overflow-hidden">
                    <img
                        src={issuer.logoUrl || FALLBACK_LOGO_URL}
                        alt={`${issuer.name} Logo`}
                        className="max-h-full max-w-full object-contain"
                        onError={(e) => { e.currentTarget.src = FALLBACK_LOGO_URL; }}
                    />
                </div>

                <div>
                    <h2 className="text-3xl font-bold text-text-primary">{issuer.name}</h2>
                    {issuer.acronym && <p className="text-sm text-text-secondary">{issuer.acronym}</p>}
                </div>
            </div>
            <span className={`inline-block px-3 py-1 mt-2 text-xs font-semibold rounded-full ${issuer.sector === 'Público' ? 'bg-blue-900/30 text-blue-400 border border-blue-800' : 'bg-green-900/30 text-green-400 border border-green-800'}`}>
                {issuer.sector || 'N/A'}
            </span>

            <div className="mt-8">
                <h3 className="text-xl font-semibold border-b border-border-subtle pb-2 text-text-primary">Documentos y Hechos Relevantes</h3>
                {loading ? (
                    <p className="text-sm text-text-tertiary mt-4">Cargando documentos...</p>
                ) : error ? (
                    <p className="text-sm text-status-danger mt-4">{error}</p>
                ) : documents.length > 0 ? (
                    <div className="mt-6 space-y-6">
                        {Object.entries(groupedDocuments).map(([category, docs]) => (
                            <div key={category}>
                                <h4 className="font-bold text-accent-primary mb-3">{category}</h4>
                                <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {docs.map((doc, index) => (
                                        <li key={index} className="bg-bg-tertiary hover:bg-bg-elevated border border-border-subtle rounded-lg p-3 transition-all duration-200">
                                            <a href={doc.url} target="_blank" rel="noopener noreferrer" className="flex flex-col h-full">
                                                <span className="text-text-primary font-medium hover:text-accent-primary transition-colors line-clamp-2">{doc.title}</span>
                                                {doc.date && <span className="text-xs text-text-tertiary mt-2 block">{formatDate(doc.date)}</span>}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-text-tertiary mt-4">No se encontraron documentos para este emisor.</p>
                )}
            </div>
        </div>
    );
};

export default IssuerDetailView;
