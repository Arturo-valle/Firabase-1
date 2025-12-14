import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Issuer } from '../types';
import {
    CreditRatingChart,
    FinancialRatiosChart,
    RiskAssessmentChart,
    ComparativeChart
} from './ChartComponents';
import {
    parseCreditRatingData,
    parseFinancialRatios,
    parseRiskScores,
    parseComparativeData,
    type CreditRatingDataPoint,
    type FinancialRatio,
    type RiskScore,
    type ComparativeData,
} from '../utils/dataParser';

interface AIAnalysisProps {
    issuers: Issuer[];
    initialIssuerId?: string;
}

interface QueryHistory {
    id: string;
    query: string;
    answer: string;
    timestamp: Date;
    saved: boolean;
    issuers: string[];
}

const AIAnalysis: React.FC<AIAnalysisProps> = ({ issuers, initialIssuerId }) => {
    const [query, setQuery] = useState('');
    const [selectedIssuers, setSelectedIssuers] = useState<string[]>(initialIssuerId ? [initialIssuerId] : []);
    const [analysisType, setAnalysisType] = useState<string>('general');
    const [loading, setLoading] = useState(false);
    const [response, setResponse] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [history, setHistory] = useState<QueryHistory[]>([]);
    const [chartData, setChartData] = useState<{
        creditRating: CreditRatingDataPoint[];
        ratios: FinancialRatio[];
        riskScores: RiskScore[];
        comparative: ComparativeData[];
    }>({ creditRating: [], ratios: [], riskScores: [], comparative: [] });


    // Use all issuers passed as props (already filtered by backend to be active/processed)
    const activeIssuers = issuers;

    // Debug logging
    useEffect(() => {
        console.log('[AIAnalysis] Props received. issuers:', issuers);
        console.log('[AIAnalysis] activeIssuers:', activeIssuers);
        console.log('[AIAnalysis] Number of active issuers:', activeIssuers.length);
    }, [issuers, activeIssuers]);

    // Load history
    useEffect(() => {
        const savedHistory = localStorage.getItem('queryHistory');
        if (savedHistory) {
            setHistory(JSON.parse(savedHistory).map((h: any) => ({
                ...h,
                timestamp: new Date(h.timestamp)
            })));
        }
    }, []);

    // Export to PDF
    const exportToPDF = () => {
        if (!response) return;

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 20;
        let yPosition = 20;

        // Title
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('Análisis Financiero - CentraCapital Intelligence', margin, yPosition);

        // Date
        yPosition += 10;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Fecha: ${new Date().toLocaleString('es-NI')}`, margin, yPosition);

        // Query
        yPosition += 15;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Consulta:', margin, yPosition);
        yPosition += 7;
        doc.setFont('helvetica', 'normal');
        const queryLines = doc.splitTextToSize(query, pageWidth - 2 * margin);
        doc.text(queryLines, margin, yPosition);
        yPosition += queryLines.length * 7 + 10;

        // Answer
        doc.setFont('helvetica', 'bold');
        doc.text('Análisis:', margin, yPosition);
        yPosition += 7;
        doc.setFont('helvetica', 'normal');
        const answerLines = doc.splitTextToSize(response.answer, pageWidth - 2 * margin);
        answerLines.forEach((line: string) => {
            if (yPosition > 270) {
                doc.addPage();
                yPosition = 20;
            }
            doc.text(line, margin, yPosition);
            yPosition += 7;
        });

        doc.save('analisis_financiero.pdf');
    };

    // Normalize issuer ID for backend compatibility
    // Frontend uses underscores (corporación_agricola), backend expects spaces (corporacion agricola)
    const normalizeIssuerId = (id: string): string => {
        return id
            .replace(/_/g, ' ')  // Replace underscores with spaces
            .normalize('NFD')    // Decompose accented characters
            .replace(/[\u0300-\u036f]/g, '')  // Remove diacritics
            .toLowerCase()
            .trim();
    };

    const handleAnalyze = async () => {
        if (!query.trim() || selectedIssuers.length === 0) {
            setError('Por favor ingresa una consulta y selecciona al menos un emisor.');
            return;
        }

        setLoading(true);
        setError(null);
        setResponse(null);

        try {
            // Determine analysis type automatically if multiple issuers selected
            const type = selectedIssuers.length > 1 ? 'comparative' : analysisType;

            // Normalize issuer IDs for backend
            const normalizedIds = selectedIssuers.map(normalizeIssuerId);
            const issuerIdParam = normalizedIds.length === 1 ? normalizedIds[0] : normalizedIds;

            const res = await fetch('https://api-os3qsxfz6q-uc.a.run.app/ai/query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query,
                    issuerId: issuerIdParam,
                    analysisType: type
                }),
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Error en el análisis');

            setResponse(data);

            // Parse chart data if available
            if (data.answer) {
                const newChartData = {
                    creditRating: parseCreditRatingData(data.answer),
                    ratios: parseFinancialRatios(data.answer),
                    riskScores: parseRiskScores(data.answer),
                    comparative: parseComparativeData(data.answer)
                };
                setChartData(newChartData);
            }

            // Save to history
            const newEntry: QueryHistory = {
                id: Date.now().toString(),
                query,
                answer: data.answer,
                timestamp: new Date(),
                saved: false,
                issuers: selectedIssuers
            };
            const updatedHistory = [newEntry, ...history].slice(0, 50);
            setHistory(updatedHistory);
            localStorage.setItem('queryHistory', JSON.stringify(updatedHistory));

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header Section */}
            <div className="card">
                <h2 className="text-2xl font-bold text-text-primary mb-4">🤖 Análisis Financiero Inteligente</h2>

                {/* Issuer Selection - Simplified with Dropdowns */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                        Selecciona hasta 3 emisores para comparar:
                    </label>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                        {/* Issuer 1 */}
                        <select
                            value={selectedIssuers[0] || ''}
                            onChange={(e) => {
                                const newSelection = [e.target.value, selectedIssuers[1], selectedIssuers[2]].filter(Boolean);
                                setSelectedIssuers(newSelection);
                            }}
                            className="input w-full"
                        >
                            <option value="">Emisor 1 (opcional)</option>
                            {activeIssuers.map(issuer => (
                                <option key={issuer.id} value={issuer.id}>
                                    {issuer.name}
                                </option>
                            ))}
                        </select>

                        {/* Issuer 2 */}
                        <select
                            value={selectedIssuers[1] || ''}
                            onChange={(e) => {
                                const newSelection = [selectedIssuers[0], e.target.value, selectedIssuers[2]].filter(Boolean);
                                setSelectedIssuers(newSelection);
                            }}
                            className="input w-full"
                        >
                            <option value="">Emisor 2 (opcional)</option>
                            {activeIssuers.map(issuer => (
                                <option key={issuer.id} value={issuer.id}>
                                    {issuer.name}
                                </option>
                            ))}
                        </select>

                        {/* Issuer 3 */}
                        <select
                            value={selectedIssuers[2] || ''}
                            onChange={(e) => {
                                const newSelection = [selectedIssuers[0], selectedIssuers[1], e.target.value].filter(Boolean);
                                setSelectedIssuers(newSelection);
                            }}
                            className="input w-full"
                        >
                            <option value="">Emisor 3 (opcional)</option>
                            {activeIssuers.map(issuer => (
                                <option key={issuer.id} value={issuer.id}>
                                    {issuer.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Selected Issuers Display */}
                    {selectedIssuers.length > 0 && (
                        <div className="bg-bg-tertiary border border-border-subtle rounded-lg p-3">
                            <p className="text-sm text-accent-primary font-medium mb-1">
                                Seleccionados ({selectedIssuers.length}):
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {selectedIssuers.map(id => {
                                    const issuer = activeIssuers.find(i => i.id === id);
                                    return issuer ? (
                                        <span key={id} className="inline-flex items-center gap-1 bg-accent-primary/20 text-accent-primary border border-accent-primary/30 px-3 py-1 rounded-full text-sm">
                                            {issuer.name}
                                            <button
                                                onClick={() => setSelectedIssuers(prev => prev.filter(i => i !== id))}
                                                className="hover:bg-accent-primary/30 rounded-full px-1 transition-colors"
                                            >
                                                ×
                                            </button>
                                        </span>
                                    ) : null;
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Query Input */}
                <div className="flex gap-4">
                    <div className="flex-1">
                        <textarea
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Ej: Compara la liquidez y solvencia de estos bancos en el último año..."
                            className="input w-full h-32 resize-none"
                        />
                    </div>
                    <div className="w-48 flex flex-col gap-2">
                        <select
                            value={analysisType}
                            onChange={(e) => setAnalysisType(e.target.value)}
                            className="input w-full"
                            disabled={selectedIssuers.length > 1}
                        >
                            <option value="general">Análisis General</option>
                            <option value="financial">Financiero</option>
                            <option value="creditRating">Calificación Riesgo</option>
                            <option value="comparative">Comparativo</option>
                        </select>
                        <button
                            onClick={handleAnalyze}
                            disabled={loading}
                            className={`w-full py-3 px-4 rounded-lg font-bold text-bg-primary shadow-lg transition-all ${loading
                                ? 'bg-text-disabled cursor-not-allowed'
                                : 'bg-accent-primary hover:bg-accent-hover transform hover:-translate-y-0.5'
                                }`}
                        >
                            {loading ? 'Analizando...' : '✨ Analizar'}
                        </button>
                    </div>
                </div>
                {error && <p className="mt-2 text-status-danger text-sm">{error}</p>}
            </div>

            {/* Results Section */}
            {response && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
                    {/* Main Analysis */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="flex justify-between items-center card py-4">
                            <h3 className="text-lg font-bold text-text-primary">Resultados del Análisis</h3>
                            <button
                                onClick={exportToPDF}
                                className="text-sm text-accent-primary hover:text-accent-hover font-medium flex items-center gap-2 transition-colors"
                            >
                                📥 Exportar PDF
                            </button>
                        </div>

                        <div className="card p-8">
                            <div className="prose prose-invert max-w-none text-text-secondary">
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                        table: ({ node, ...props }) => <div className="overflow-x-auto my-4"><table className="min-w-full divide-y divide-border-subtle border border-border-subtle" {...props} /></div>,
                                        th: ({ node, ...props }) => <th className="bg-bg-tertiary px-4 py-2 text-left text-xs font-medium text-text-secondary uppercase tracking-wider border-b border-border-subtle" {...props} />,
                                        td: ({ node, ...props }) => <td className="px-4 py-2 whitespace-nowrap text-sm text-text-primary border-b border-border-subtle" {...props} />
                                    }}
                                >
                                    {response.answer}
                                </ReactMarkdown>
                            </div>
                        </div>

                        {/* Charts */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {chartData.creditRating.length > 0 && (
                                <div className="card">
                                    <h3 className="text-lg font-bold mb-4 text-text-primary">Evolución Calificación</h3>
                                    <CreditRatingChart data={chartData.creditRating} />
                                </div>
                            )}
                            {chartData.ratios.length > 0 && (
                                <div className="card">
                                    <h3 className="text-lg font-bold mb-4 text-text-primary">Ratios Financieros</h3>
                                    <FinancialRatiosChart data={chartData.ratios} />
                                </div>
                            )}
                            {chartData.riskScores.length > 0 && (
                                <div className="card">
                                    <h3 className="text-lg font-bold mb-4 text-text-primary">Evaluación de Riesgos</h3>
                                    <RiskAssessmentChart data={chartData.riskScores} />
                                </div>
                            )}
                            {chartData.comparative.length > 0 && (
                                <div className="card">
                                    <h3 className="text-lg font-bold mb-4 text-text-primary">Comparativa Visual</h3>
                                    <div className="h-64">
                                        <ComparativeChart data={chartData.comparative} />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sidebar: Metadata & Sources */}
                    <div className="space-y-6">
                        {/* Analysis Stats */}
                        <div className="card bg-bg-tertiary border-none">
                            <h3 className="text-sm font-bold text-text-tertiary uppercase mb-4">Detalles del Análisis</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-text-secondary">Chunks Analizados:</span>
                                    <span className="font-mono font-bold text-accent-primary">{response.metadata?.totalChunksAnalyzed || 0}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-text-secondary">Documentos Únicos:</span>
                                    <span className="font-mono font-bold text-accent-primary">{response.metadata?.uniqueDocumentCount || 0}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-text-secondary">Años Cubiertos:</span>
                                    <span className="font-mono font-bold text-accent-primary">
                                        {response.metadata?.yearsFound?.slice(0, 3).join(', ') || 'N/A'}
                                        {response.metadata?.yearsFound?.length > 3 && '...'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Sources List */}
                        <div className="card max-h-[600px] overflow-y-auto">
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-text-primary">
                                📚 Fuentes Utilizadas
                                <span className="bg-accent-primary/20 text-accent-primary text-xs px-2 py-1 rounded-full">
                                    {response.metadata?.uniqueDocuments?.length || 0}
                                </span>
                            </h3>
                            <div className="space-y-3">
                                {response.metadata?.uniqueDocuments?.map((doc: any, idx: number) => (
                                    <div key={idx} className="p-3 bg-bg-tertiary rounded-lg border border-border-subtle hover:border-accent-primary/50 transition-colors">
                                        <div className="flex items-start gap-2">
                                            <span className="text-xs font-bold text-text-tertiary mt-1">#{idx + 1}</span>
                                            <div>
                                                <p className="text-sm font-medium text-text-primary line-clamp-2" title={doc.title}>
                                                    {doc.title}
                                                </p>
                                                <div className="flex flex-wrap gap-2 mt-1">
                                                    <span className="text-xs bg-bg-secondary border border-border-subtle px-1.5 py-0.5 rounded text-text-secondary">
                                                        {doc.date || 'S/F'}
                                                    </span>
                                                    <span className="text-xs bg-blue-900/30 text-blue-400 px-1.5 py-0.5 rounded">
                                                        {doc.issuer || 'N/A'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AIAnalysis;
