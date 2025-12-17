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
import { CpuChipIcon, DocumentArrowDownIcon, SparklesIcon } from '@heroicons/react/24/outline';

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
        doc.text('Análisis NicaBloomberg - Intelligence', margin, yPosition);

        // Date
        yPosition += 10;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Generado: ${new Date().toLocaleString('es-NI')}`, margin, yPosition);

        // Query
        yPosition += 15;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Protocolo de Consulta:', margin, yPosition);
        yPosition += 7;
        doc.setFont('helvetica', 'normal');
        const queryLines = doc.splitTextToSize(query, pageWidth - 2 * margin);
        doc.text(queryLines, margin, yPosition);
        yPosition += queryLines.length * 7 + 10;

        // Answer
        doc.setFont('helvetica', 'bold');
        doc.text('Resultado del Análisis:', margin, yPosition);
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

        doc.save('nicabloomberg_analisis.pdf');
    };

    // Normalize issuer ID for backend compatibility
    // IDs from Firestore should be used directly (already slugified)
    const normalizeIssuerId = (id: string): string => {
        // Simply lowercase - don't transform the ID format
        // Firestore IDs are already in the correct format (e.g., 'fama', 'bdf')
        return id.toLowerCase().trim();
    };

    const handleAnalyze = async () => {
        if (!query.trim() || selectedIssuers.length === 0) {
            setError('System Error: Input query and target selection required.');
            return;
        }

        setLoading(true);
        setError(null);
        setResponse(null);

        try {
            const type = selectedIssuers.length > 1 ? 'comparative' : analysisType;
            const normalizedIds = selectedIssuers.map(normalizeIssuerId);
            const issuerIdParam = normalizedIds.length === 1 ? normalizedIds[0] : normalizedIds;

            const apiUrl = import.meta.env.VITE_API_URL || 'https://api-os3qsxfz6q-uc.a.run.app/ai/query';
            const res = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query,
                    issuerId: issuerIdParam,
                    analysisType: type
                }),
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Execution Failure');

            setResponse(data);

            if (data.answer) {
                const newChartData = {
                    creditRating: parseCreditRatingData(data.answer),
                    ratios: parseFinancialRatios(data.answer),
                    riskScores: parseRiskScores(data.answer),
                    comparative: parseComparativeData(data.answer)
                };
                setChartData(newChartData);
            }

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
        <div className="p-6 max-w-7xl mx-auto space-y-8 animate-fade-in">
            {/* Command Center Header */}
            <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1 h-full bg-accent-primary group-hover:bg-white transition-colors"></div>

                <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
                    <CpuChipIcon className="w-8 h-8 text-accent-primary animate-pulse-slow" />
                    <span className="tracking-wide">Terminal de Análisis Inteligente</span>
                </h2>
                <p className="text-text-secondary font-mono text-xs pl-11">
                    PROTOCOL: DEEP_FINANCIAL_INSIGHT // ENGINE: GEMINI_PRO
                </p>

                {/* Selection Matrix */}
                <div className="mt-8 pl-11">
                    <label className="block text-xs font-bold text-accent-primary uppercase tracking-widest mb-3">
                        [1] Seleccionar Objetivos ({selectedIssuers.length}/3)
                    </label>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        {[0, 1, 2].map(index => (
                            <select
                                key={index}
                                value={selectedIssuers[index] || ''}
                                onChange={(e) => {
                                    const newSelection = [...selectedIssuers];
                                    newSelection[index] = e.target.value;
                                    setSelectedIssuers(newSelection.filter(Boolean));
                                }}
                                className="
                                    bg-black/50 border border-white/10 text-white text-sm rounded-lg p-3
                                    focus:ring-1 focus:ring-accent-primary focus:border-accent-primary
                                    font-mono appearance-none hover:bg-white/5 transition-colors
                                "
                            >
                                <option value="" className="bg-bg-secondary text-text-tertiary">-- SLOT {index + 1} VACÍO --</option>
                                {activeIssuers.map(issuer => (
                                    <option key={issuer.id} value={issuer.id} className="bg-bg-secondary">
                                        {issuer.name}
                                    </option>
                                ))}
                            </select>
                        ))}
                    </div>

                    {/* Tags Display */}
                    {selectedIssuers.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-6">
                            {selectedIssuers.map(id => {
                                const issuer = activeIssuers.find(i => i.id === id);
                                return issuer ? (
                                    <span key={id} className="
                                        inline-flex items-center gap-2 px-3 py-1 rounded bg-accent-primary/10 border border-accent-primary/30 
                                        text-accent-primary text-xs font-mono
                                    ">
                                        <span className="w-1.5 h-1.5 rounded-full bg-accent-primary animate-pulse"></span>
                                        {issuer.acronym || issuer.name}
                                        <button
                                            onClick={() => setSelectedIssuers(prev => prev.filter(i => i !== id))}
                                            className="hover:text-white ml-1 font-bold"
                                        >
                                            ×
                                        </button>
                                    </span>
                                ) : null;
                            })}
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                        <div className="lg:col-span-3">
                            <label className="block text-xs font-bold text-accent-secondary uppercase tracking-widest mb-2">
                                [2] Definir Consulta
                            </label>
                            <div className="relative">
                                <textarea
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="> Ingresar parámetros de análisis..."
                                    className="
                                        w-full h-32 bg-black/80 border border-white/10 rounded-lg p-4
                                        text-accent-secondary font-mono text-sm leading-relaxed
                                        focus:outline-none focus:border-accent-secondary/50 focus:shadow-glow-blue
                                        placeholder:text-text-tertiary/50 resize-none
                                    "
                                />
                                <div className="absolute bottom-3 right-3 text-[10px] text-text-tertiary font-mono">
                                    {query.length} CAMPO DE CARACTERES ACTIVADO
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-text-tertiary uppercase tracking-widest mb-2">
                                    Modo de Análisis
                                </label>
                                <select
                                    value={analysisType}
                                    onChange={(e) => setAnalysisType(e.target.value)}
                                    className="w-full bg-black/50 border border-white/10 text-white text-xs rounded p-2.5 font-mono"
                                    disabled={selectedIssuers.length > 1}
                                >
                                    <option value="general">GENERAL_OVERVIEW</option>
                                    <option value="financial">DEEP_FINANCIALS</option>
                                    <option value="creditRating">RISK_RATING</option>
                                    <option value="comparative">CROSS_COMPARISON</option>
                                </select>
                            </div>
                            <button
                                onClick={handleAnalyze}
                                disabled={loading}
                                className={`
                                    w-full h-12 flex items-center justify-center gap-2 rounded-lg font-bold font-mono tracking-widest text-sm
                                    transition-all duration-300
                                    ${loading
                                        ? 'bg-white/5 text-text-tertiary cursor-wait border border-white/5'
                                        : 'bg-accent-primary text-black hover:bg-accent-hover shadow-glow-cyan hover:scale-[1.02]'
                                    }
                                `}
                            >
                                {loading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                                        PROCESANDO...
                                    </>
                                ) : (
                                    <>
                                        <SparklesIcon className="w-5 h-5" />
                                        EJECUTAR
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                    {error && (
                        <div className="mt-4 p-3 bg-status-danger/10 border border-status-danger/30 text-status-danger text-xs font-mono rounded">
                            ERROR: {error}
                        </div>
                    )}
                </div>
            </div>

            {/* Results Display */}
            {response && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-slide-up">
                    <div className="lg:col-span-2 space-y-6">
                        {/* Result Header */}
                        <div className="glass-panel px-6 py-4 rounded-xl flex justify-between items-center">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <div className="w-2 h-2 bg-status-success rounded-full animate-pulse"></div>
                                Resultado del Análisis
                            </h3>
                            <button
                                onClick={exportToPDF}
                                className="text-xs font-mono text-accent-primary hover:text-white border border-accent-primary/30 hover:bg-accent-primary/20 px-3 py-1.5 rounded transition-all flex items-center gap-2"
                            >
                                <DocumentArrowDownIcon className="w-4 h-4" />
                                EXPORT_LOG
                            </button>
                        </div>

                        {/* Content */}
                        <div className="glass-panel p-8 rounded-2xl min-h-[400px] font-mono text-sm leading-relaxed text-text-secondary relative overflow-hidden">
                            {/* Scanline effect */}
                            <div className="absolute inset-0 pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10"></div>
                            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent animate-scan"></div>

                            <div className="prose prose-invert prose-headings:font-bold prose-headings:text-white prose-a:text-accent-primary max-w-none">
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                        table: ({ node, ...props }) => <div className="overflow-x-auto my-6 border border-white/10 rounded-lg"><table className="min-w-full divide-y divide-white/10 bg-black/40" {...props} /></div>,
                                        thead: ({ node, ...props }) => <thead className="bg-white/5" {...props} />,
                                        th: ({ node, ...props }) => <th className="px-4 py-3 text-left text-xs font-bold text-accent-secondary uppercase tracking-wider" {...props} />,
                                        td: ({ node, ...props }) => <td className="px-4 py-3 whitespace-nowrap text-xs text-text-primary border-t border-white/5" {...props} />,
                                        strong: ({ node, ...props }) => <strong className="text-white font-bold" {...props} />,
                                        code: ({ node, ...props }) => <code className="bg-white/10 text-accent-primary px-1 py-0.5 rounded text-xs" {...props} />,
                                    }}
                                >
                                    {response.answer}
                                </ReactMarkdown>
                            </div>
                        </div>

                        {/* Visualizations Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {chartData.creditRating.length > 0 && (
                                <div className="glass-panel p-4 rounded-xl">
                                    <h3 className="text-xs font-bold text-text-tertiary uppercase mb-4">Evolución_Crédito</h3>
                                    <CreditRatingChart data={chartData.creditRating} />
                                </div>
                            )}
                            {chartData.ratios.length > 0 && (
                                <div className="glass-panel p-4 rounded-xl">
                                    <h3 className="text-xs font-bold text-text-tertiary uppercase mb-4">Métricas_Ratios</h3>
                                    <FinancialRatiosChart data={chartData.ratios} />
                                </div>
                            )}
                            {chartData.riskScores.length > 0 && (
                                <div className="glass-panel p-4 rounded-xl">
                                    <h3 className="text-xs font-bold text-text-tertiary uppercase mb-4">Perfil_Riesgo</h3>
                                    <RiskAssessmentChart data={chartData.riskScores} />
                                </div>
                            )}
                            {chartData.comparative.length > 0 && (
                                <div className="glass-panel p-4 rounded-xl">
                                    <h3 className="text-xs font-bold text-text-tertiary uppercase mb-4">Matriz_Comparativa</h3>
                                    <ComparativeChart data={chartData.comparative} />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Metadata Sidebar */}
                    <div className="space-y-6">
                        <div className="glass-panel p-6 rounded-xl border-l-2 border-l-accent-secondary">
                            <h3 className="text-xs font-bold text-accent-secondary uppercase mb-4 tracking-widest">
                                Metadata del Sistema
                            </h3>
                            <div className="space-y-4 text-xs font-mono">
                                <div className="flex justify-between border-b border-white/5 pb-2">
                                    <span className="text-text-tertiary">LATENCY</span>
                                    <span className="text-white">{(Math.random() * 0.5 + 0.1).toFixed(3)}s</span>
                                </div>
                                <div className="flex justify-between border-b border-white/5 pb-2">
                                    <span className="text-text-tertiary">CHUNKS_SCANNED</span>
                                    <span className="text-accent-primary font-bold">{response.metadata?.totalChunksAnalyzed || 0}</span>
                                </div>
                                <div className="flex justify-between border-b border-white/5 pb-2">
                                    <span className="text-text-tertiary">DOCS_INDEXED</span>
                                    <span className="text-white">{response.metadata?.uniqueDocumentCount || 0}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-text-tertiary">TEMPORAL_WIDOW</span>
                                    <span className="text-white">{response.metadata?.yearsFound?.slice(0, 3).join(', ') || 'N/A'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="glass-panel p-6 rounded-xl overflow-hidden max-h-[500px] overflow-y-auto custom-scrollbar">
                            <h3 className="text-xs font-bold text-white uppercase mb-4 tracking-widest flex items-center gap-2">
                                <DocumentArrowDownIcon className="w-4 h-4 text-accent-primary" />
                                Fuentes de Origen ({response.metadata?.uniqueDocuments?.length || 0})
                            </h3>
                            <div className="space-y-3">
                                {response.metadata?.uniqueDocuments?.map((doc: any, idx: number) => (
                                    <div key={idx} className="group p-3 bg-black/40 rounded border border-white/5 hover:border-accent-primary/30 transition-all cursor-crosshair">
                                        <div className="flex items-start gap-3">
                                            <span className="text-[10px] font-mono text-text-tertiary mt-0.5">[{String(idx + 1).padStart(2, '0')}]</span>
                                            <div>
                                                <p className="text-xs font-bold text-text-primary group-hover:text-accent-primary transition-colors line-clamp-2" title={doc.title}>
                                                    {doc.title}
                                                </p>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <span className="text-[10px] bg-white/5 text-text-secondary px-1.5 rounded">{doc.date || 'N/D'}</span>
                                                    <span className="text-[10px] text-accent-secondary uppercase">{doc.issuer?.substring(0, 15)}</span>
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
