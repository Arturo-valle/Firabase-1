import React, { useState, useEffect } from 'react';
import { apiClient } from '../utils/apiClient';
import { AIChat } from '../components/AIChat';
import type { Issuer } from '../types';

interface MarketDashboardProps {
    onSelectIssuer: (issuer: Issuer) => void;
}

export const MarketDashboard: React.FC<MarketDashboardProps> = ({ onSelectIssuer }) => {
    const [issuers, setIssuers] = useState<Issuer[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'market' | 'news'>('market');

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch issuers from our API using central apiClient
                const data = await apiClient<{ issuers: Issuer[] }>('/issuers');
                if (data.issuers) {
                    // Filter only active ones if necessary
                    const active = data.issuers.filter((i: any) => i.active !== false);
                    setIssuers(active);
                }
            } catch (error) {
                console.error("Error fetching market data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Calculate some market stats
    const totalIssuers = issuers.length;
    const privateIssuers = issuers.filter(i => i.sector === 'Privado').length;
    const publicIssuers = issuers.filter(i => i.sector === 'Público' || i.sector === 'Internacional').length;

    return (
        <div className="min-h-screen bg-gray-950 text-gray-100 font-sans selection:bg-blue-500 selection:text-white">

            {/* Top Ticker */}
            <div className="bg-gray-900 border-b border-gray-800 overflow-hidden whitespace-nowrap py-2">
                <div className="inline-block animate-marquee pl-4">
                    {issuers.map((issuer, idx) => (
                        <span key={idx} className="mx-6 text-sm font-mono text-gray-400">
                            <span className="font-bold text-gray-200">{issuer.acronym || issuer.name.substring(0, 15)}</span>
                            <span className="ml-2 text-green-400">● ACTIVO</span>
                        </span>
                    ))}
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* Header */}
                <div className="flex justify-between items-end mb-8">
                    <div>
                        <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-400">Nica</span>Bloomberg
                        </h1>
                        <p className="text-gray-400">Inteligencia de Mercado en Tiempo Real</p>
                    </div>
                    <div className="flex space-x-4 text-sm text-gray-400">
                        <div className="text-right">
                            <p className="font-bold text-white text-xl">{totalIssuers}</p>
                            <p>Emisores Activos</p>
                        </div>
                        <div className="text-right border-l border-gray-700 pl-4">
                            <p className="font-bold text-white text-xl">{privateIssuers}</p>
                            <p>Sector Privado</p>
                        </div>
                        <div className="text-right border-l border-gray-700 pl-4">
                            <p className="font-bold text-white text-xl">{publicIssuers}</p>
                            <p>Público / Int.</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Left Column: Market List */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Tabs */}
                        <div className="flex space-x-1 bg-gray-900 p-1 rounded-lg inline-flex mb-4">
                            <button
                                onClick={() => setActiveTab('market')}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'market' ? 'bg-gray-800 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                            >
                                Mercado
                            </button>
                            <button
                                onClick={() => setActiveTab('news')}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'news' ? 'bg-gray-800 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                            >
                                Hechos Relevantes
                            </button>
                        </div>

                        {activeTab === 'market' ? (
                            <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden shadow-xl">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-gray-800 text-gray-400 text-xs uppercase tracking-wider">
                                                <th className="px-6 py-4 font-medium">Emisor</th>
                                                <th className="px-6 py-4 font-medium">Sector</th>
                                                <th className="px-6 py-4 font-medium">Estado</th>
                                                <th className="px-6 py-4 font-medium text-right">Acción</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-800">
                                            {loading ? (
                                                [...Array(5)].map((_, i) => (
                                                    <tr key={i} className="animate-pulse">
                                                        <td className="px-6 py-4"><div className="h-4 bg-gray-800 rounded w-3/4"></div></td>
                                                        <td className="px-6 py-4"><div className="h-4 bg-gray-800 rounded w-1/2"></div></td>
                                                        <td className="px-6 py-4"><div className="h-4 bg-gray-800 rounded w-1/4"></div></td>
                                                        <td className="px-6 py-4"></td>
                                                    </tr>
                                                ))
                                            ) : (
                                                issuers.map((issuer) => (
                                                    <tr key={issuer.id || issuer.name} className="hover:bg-gray-800/50 transition-colors group">
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center">
                                                                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white mr-3">
                                                                    {issuer.acronym ? issuer.acronym.substring(0, 2) : issuer.name.substring(0, 2)}
                                                                </div>
                                                                <div>
                                                                    <p className="font-medium text-white">{issuer.name}</p>
                                                                    <p className="text-xs text-gray-500">{issuer.acronym}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${issuer.sector === 'Privado' ? 'bg-blue-900/30 text-blue-400 border border-blue-800' : 'bg-purple-900/30 text-purple-400 border border-purple-800'
                                                                }`}>
                                                                {issuer.sector}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-gray-400">
                                                            <div className="flex items-center">
                                                                <div className="h-2 w-2 rounded-full bg-green-500 mr-2"></div>
                                                                Activo
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <button
                                                                onClick={() => onSelectIssuer(issuer)}
                                                                className="text-blue-400 hover:text-blue-300 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                                                            >
                                                                Ver Análisis →
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-gray-900 rounded-xl border border-gray-800 p-8 text-center text-gray-500">
                                <p>El feed de noticias en tiempo real se está cargando...</p>
                                {/* Placeholder for News Feed */}
                            </div>
                        )}
                    </div>

                    {/* Right Column: AI Assistant */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-8 space-y-6">
                            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl border border-gray-700 p-1 shadow-2xl">
                                <AIChat />
                            </div>

                            <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
                                <h3 className="text-lg font-semibold text-white mb-4">Tendencias de Mercado</h3>
                                <div className="space-y-4">
                                    {['Tasas de Interés BCN', 'Bonos del Tesoro', 'Inflación Acumulada'].map((item, i) => (
                                        <div key={i} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg hover:bg-gray-750 cursor-pointer transition-colors">
                                            <span className="text-sm text-gray-300">{item}</span>
                                            <span className="text-xs text-green-400 font-mono">+0.5%</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};
