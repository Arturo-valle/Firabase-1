import React, { useState, useEffect } from 'react';
import { AIChat } from '../components/AIChat';
import type { Issuer, Document } from '../types';

interface IssuerProfileProps {
    issuer: Issuer;
    onBack: () => void;
}

export const IssuerProfile: React.FC<IssuerProfileProps> = ({ issuer, onBack }) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'ai'>('overview');
    const [documents, setDocuments] = useState<Document[]>([]);

    useEffect(() => {
        if (issuer.documents) {
            setDocuments(issuer.documents);
        }
    }, [issuer]);

    const groupDocuments = (docs: Document[]) => {
        return docs.reduce((acc, doc) => {
            const type = doc.type || 'Otros';
            if (!acc[type]) acc[type] = [];
            acc[type].push(doc);
            return acc;
        }, {} as Record<string, Document[]>);
    };

    const groupedDocs = groupDocuments(documents);

    return (
        <div className="min-h-screen bg-gray-950 text-gray-100 font-sans">
            {/* Header */}
            <div className="bg-gray-900 border-b border-gray-800 p-6">
                <button onClick={onBack} className="text-gray-400 hover:text-white mb-4 flex items-center text-sm font-medium transition-colors">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    Volver al Dashboard
                </button>

                <div className="flex items-center justify-between">
                    <div className="flex items-center">
                        <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center text-2xl font-bold text-white mr-6 shadow-lg">
                            {issuer.acronym ? issuer.acronym.substring(0, 2) : issuer.name.substring(0, 2)}
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-white">{issuer.name}</h1>
                            <div className="flex items-center mt-2 space-x-4">
                                <span className="text-gray-400 text-sm">{issuer.acronym}</span>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${issuer.sector === 'Privado' ? 'bg-blue-900/30 text-blue-400 border-blue-800' : 'bg-purple-900/30 text-purple-400 border-purple-800'
                                    }`}>
                                    {issuer.sector}
                                </span>
                                <span className="flex items-center text-green-400 text-xs font-medium">
                                    <div className="h-1.5 w-1.5 rounded-full bg-green-500 mr-1.5"></div>
                                    Emisor Activo
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="text-right hidden md:block">
                        <p className="text-sm text-gray-500">Última actualización</p>
                        <p className="text-white font-mono">{new Date().toLocaleDateString()}</p>
                    </div>
                </div>

                {/* Navigation */}
                <div className="flex space-x-6 mt-8 border-b border-gray-800">
                    {['overview', 'documents', 'ai'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`pb-3 text-sm font-medium transition-all border-b-2 ${activeTab === tab
                                ? 'border-blue-500 text-white'
                                : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-700'
                                }`}
                        >
                            {tab === 'overview' && 'Resumen Financiero'}
                            {tab === 'documents' && 'Documentos Oficiales'}
                            {tab === 'ai' && 'Análisis IA'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
                                <h3 className="text-lg font-semibold text-white mb-4">Perfil Corporativo</h3>
                                <p className="text-gray-400 leading-relaxed">
                                    {issuer.name} es una entidad clave en el sector {issuer.sector.toLowerCase()}.
                                    Como emisor activo en la Bolsa de Valores de Nicaragua, mantiene una presencia regular en el mercado de capitales.
                                    Utilice la pestaña "Análisis IA" para obtener un reporte detallado sobre su situación financiera actual basado en los últimos documentos publicados.
                                </p>
                            </div>

                            {/* Placeholder for charts */}
                            <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 h-64 flex items-center justify-center text-gray-600">
                                [Gráfico de Rendimiento - Próximamente]
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
                                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Datos Clave</h3>
                                <dl className="space-y-4">
                                    <div className="flex justify-between">
                                        <dt className="text-gray-500">País</dt>
                                        <dd className="text-white">Nicaragua</dd>
                                    </div>
                                    <div className="flex justify-between">
                                        <dt className="text-gray-500">Moneda</dt>
                                        <dd className="text-white">C$ / USD</dd>
                                    </div>
                                    <div className="flex justify-between">
                                        <dt className="text-gray-500">Documentos</dt>
                                        <dd className="text-white">{documents.length}</dd>
                                    </div>
                                </dl>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'documents' && (
                    <div className="animate-fade-in">
                        {documents.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {Object.entries(groupedDocs).map(([category, docs]) => (
                                    <div key={category} className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
                                        <div className="bg-gray-800 px-6 py-3 border-b border-gray-700">
                                            <h3 className="font-semibold text-white">{category}</h3>
                                        </div>
                                        <ul className="divide-y divide-gray-800">
                                            {docs.map((doc, idx) => (
                                                <li key={idx} className="px-6 py-4 hover:bg-gray-800/50 transition-colors">
                                                    <a href={doc.url} target="_blank" rel="noopener noreferrer" className="flex items-start group">
                                                        <svg className="w-5 h-5 text-gray-500 mt-0.5 mr-3 group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                                        <div>
                                                            <p className="text-sm text-gray-300 group-hover:text-blue-400 transition-colors font-medium">{doc.title}</p>
                                                            {doc.date && <p className="text-xs text-gray-500 mt-1">{doc.date}</p>}
                                                        </div>
                                                    </a>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 text-gray-500 bg-gray-900 rounded-xl border border-gray-800">
                                No hay documentos disponibles para este emisor.
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'ai' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
                        <div className="lg:col-span-2">
                            <AIChat />
                        </div>
                        <div className="space-y-6">
                            <div className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 rounded-xl border border-blue-800/30 p-6">
                                <h3 className="text-lg font-semibold text-blue-400 mb-4">Sugerencias</h3>
                                <p className="text-sm text-gray-400 mb-4">Prueba preguntar sobre:</p>
                                <ul className="space-y-3">
                                    {[
                                        `¿Cuál es la situación financiera de ${issuer.name}?`,
                                        `Resumen de los últimos hechos relevantes`,
                                        `Análisis de riesgos principales`,
                                        `Comparativa con el sector`
                                    ].map((q, i) => (
                                        <li key={i} className="bg-gray-800 hover:bg-gray-700 p-3 rounded-lg text-sm text-gray-300 cursor-pointer transition-colors border border-gray-700 hover:border-gray-600">
                                            "{q}"
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};
