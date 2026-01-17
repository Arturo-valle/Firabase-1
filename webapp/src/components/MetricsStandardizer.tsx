import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Issuer, MetricsData } from '../types';
import MetricCard from './MetricCard';
import CustomSelect from './ui/CustomSelect';
import { formatDate } from '../utils/formatters';
import { useIssuerMetrics } from '../hooks/useIssuerMetrics';
import StandardizerSkeleton from './StandardizerSkeleton';

interface MetricsStandardizerProps {
    issuers: Issuer[];
}

// --- Sub-components ---

const SectionHeader: React.FC<{ icon: string; title: string }> = ({ icon, title }) => (
    <h2 className="text-2xl font-bold text-text-primary mb-4 flex items-center gap-2">
        <span>{icon}</span> {title}
    </h2>
);

const MetadataPanel: React.FC<{ metrics: MetricsData }> = ({ metrics }) => (
    <div className="bg-bg-tertiary border border-border-subtle rounded-xl p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            <div>
                <span className="text-text-secondary font-medium">Emisor:</span>
                <p className="text-text-primary font-semibold">{metrics.issuerName}</p>
            </div>
            <div>
                <span className="text-text-secondary font-medium">Período:</span>
                <p className="text-text-primary font-semibold">{metrics.metadata?.periodo || 'N/D'}</p>
            </div>
            <div>
                <span className="text-text-secondary font-medium">Moneda:</span>
                <p className="text-text-primary font-semibold">{metrics.metadata?.moneda || 'N/D'}</p>
            </div>
            <div>
                <span className="text-text-secondary font-medium">Última Actualización:</span>
                <p className="text-text-primary font-semibold">
                    {formatDate(metrics.extractedAt)}
                </p>
            </div>
        </div>
    </div>
);

// --- Main Component ---

const MetricsStandardizer: React.FC<MetricsStandardizerProps> = ({ issuers }) => {
    const [selectedIssuerId, setSelectedIssuerId] = useState<string>('');
    const {
        metrics,
        loading,
        extracting,
        error,
        loadMetrics,
        extractMetrics,
        resetMetrics
    } = useIssuerMetrics();

    useEffect(() => {
        if (!selectedIssuerId) {
            resetMetrics();
            return;
        }
        loadMetrics(selectedIssuerId);
    }, [selectedIssuerId, loadMetrics, resetMetrics]);

    const handleExtract = () => {
        if (selectedIssuerId) {
            extractMetrics(selectedIssuerId);
        }
    };

    const selectedIssuer = useMemo(() =>
        issuers.find(i => i.id === selectedIssuerId),
        [issuers, selectedIssuerId]);

    // Transform issuers to SelectOption format
    const issuerOptions = useMemo(() =>
        issuers.map(issuer => ({
            value: issuer.id,
            label: `${issuer.name}${issuer.acronym ? ` (${issuer.acronym})` : ''}`
        })),
        [issuers]);

    const cardContainerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.05 }
        }
    };

    const cardItemVariants = {
        hidden: { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0 }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="mb-8"
            >
                <h1 className="text-3xl font-bold text-text-primary mb-2">
                    📋 Módulo Estandarizador
                </h1>
                <p className="text-lg text-text-secondary">
                    Visualización de métricas financieras estructuradas.
                </p>
            </motion.div>

            {/* Issuer Selector */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="card mb-6"
            >
                <label className="block text-sm font-medium text-text-secondary mb-2">
                    Selecciona un Emisor
                </label>
                <div className="flex gap-4 items-end">
                    <CustomSelect
                        options={issuerOptions}
                        value={selectedIssuerId}
                        onChange={setSelectedIssuerId}
                        placeholder="-- Seleccionar emisor --"
                        className="flex-1"
                    />

                    {selectedIssuerId && (
                        <button
                            onClick={handleExtract}
                            disabled={extracting}
                            className={`px-6 py-2 rounded-lg font-semibold text-bg-primary transition-all ${extracting
                                ? 'bg-text-disabled cursor-not-allowed'
                                : 'bg-accent-primary hover:bg-accent-hover shadow-lg hover:shadow-glow'
                                }`}
                        >
                            {extracting ? '⏳ Extrayendo...' : '✨ Extraer Métricas'}
                        </button>
                    )}
                </div>
            </motion.div>

            {/* Status Messages */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-red-900/20 border border-status-danger/50 rounded-xl p-4 mb-6 overflow-hidden"
                    >
                        <p className="text-status-danger text-sm">⚠️ {error}</p>
                    </motion.div>
                )}
            </AnimatePresence>

            {loading && (
                <div className="mt-8">
                    <StandardizerSkeleton hideHeader={true} />
                </div>
            )}

            {/* Conditional Rendering */}
            <AnimatePresence mode="wait">
                {!selectedIssuerId && !loading && (
                    <motion.div
                        key="placeholder"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="card p-12 text-center border-dashed border-2 border-border-subtle bg-transparent"
                    >
                        <div className="text-6xl mb-4 grayscale opacity-50">📊</div>
                        <h3 className="text-xl font-semibold text-text-primary mb-2">Selecciona un Emisor</h3>
                        <p className="text-text-secondary">Elige un emisor del menú desplegable para ver sus métricas financieras.</p>
                    </motion.div>
                )}

                {selectedIssuerId && !loading && !metrics && !error && (
                    <motion.div
                        key="no-metrics"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="bg-bg-tertiary border border-status-warning/30 rounded-xl p-8 text-center"
                    >
                        <div className="text-5xl mb-4">📥</div>
                        <h3 className="text-xl font-semibold text-status-warning mb-2">No hay métricas disponibles</h3>
                        <p className="text-text-secondary mb-4">
                            Las métricas para <strong>{selectedIssuer?.name}</strong> aún no han sido extraídas.
                        </p>
                        <button
                            onClick={handleExtract}
                            disabled={extracting}
                            className="px-6 py-3 bg-status-warning hover:bg-yellow-600 text-bg-primary rounded-lg font-semibold transition-all"
                        >
                            {extracting ? '⏳ Extrayendo...' : '✨ Extraer Métricas Ahora'}
                        </button>
                    </motion.div>
                )}

                {selectedIssuerId && metrics && !loading && (
                    <motion.div
                        key={selectedIssuerId}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="space-y-12"
                    >
                        <MetadataPanel metrics={metrics} />

                        <div className="space-y-12">
                            {/* Liquidez */}
                            <motion.section variants={cardContainerVariants} initial="hidden" animate="visible">
                                <SectionHeader icon="💧" title="Liquidez" />
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <motion.div variants={cardItemVariants}><MetricCard icon="💧" label="Ratio Circulante" value={metrics.liquidez.ratioCirculante} unit="x" color="blue" subtitle="Activo Circulante / Pasivo Circulante" /></motion.div>
                                    <motion.div variants={cardItemVariants}><MetricCard icon="⚡" label="Prueba Ácida" value={metrics.liquidez.pruebaAcida} unit="x" color="blue" /></motion.div>
                                    <motion.div variants={cardItemVariants}><MetricCard icon="💰" label="Capital de Trabajo" value={metrics.liquidez.capitalTrabajo} unit="M" color="blue" /></motion.div>
                                </div>
                            </motion.section>

                            {/* Solvencia */}
                            <motion.section variants={cardContainerVariants} initial="hidden" animate="visible">
                                <SectionHeader icon="🛡️" title="Solvencia" />
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <motion.div variants={cardItemVariants}><MetricCard icon="📊" label="Deuda / Activos" value={metrics.solvencia.deudaActivos} unit="%" color="green" /></motion.div>
                                    <motion.div variants={cardItemVariants}><MetricCard icon="⚖️" label="Deuda / Patrimonio" value={metrics.solvencia.deudaPatrimonio} unit="x" color="green" /></motion.div>
                                    <motion.div variants={cardItemVariants}><MetricCard icon="🔒" label="Cobertura de Intereses" value={metrics.solvencia.coberturIntereses} unit="x" color="green" /></motion.div>
                                </div>
                            </motion.section>

                            {/* Rentabilidad */}
                            <motion.section variants={cardContainerVariants} initial="hidden" animate="visible">
                                <SectionHeader icon="💰" title="Rentabilidad" />
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <motion.div variants={cardItemVariants}><MetricCard icon="📈" label="ROE" value={metrics.rentabilidad.roe} unit="%" color="amber" subtitle="Return on Equity" /></motion.div>
                                    <motion.div variants={cardItemVariants}><MetricCard icon="📊" label="ROA" value={metrics.rentabilidad.roa} unit="%" color="amber" subtitle="Return on Assets" /></motion.div>
                                    <motion.div variants={cardItemVariants}><MetricCard icon="💵" label="Margen Neto" value={metrics.rentabilidad.margenNeto} unit="%" color="amber" /></motion.div>
                                    <motion.div variants={cardItemVariants}><MetricCard icon="✨" label="Utilidad Neta" value={metrics.rentabilidad.utilidadNeta} unit="M" color="amber" /></motion.div>
                                </div>
                            </motion.section>

                            {/* Eficiencia */}
                            <motion.section variants={cardContainerVariants} initial="hidden" animate="visible">
                                <SectionHeader icon="⚡" title="Eficiencia" />
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <motion.div variants={cardItemVariants}><MetricCard icon="🔄" label="Rotación de Activos" value={metrics.eficiencia.rotacionActivos} unit="x" color="purple" /></motion.div>
                                    <motion.div variants={cardItemVariants}><MetricCard icon="📦" label="Rotación de Cartera" value={metrics.eficiencia.rotacionCartera} unit="x" color="purple" /></motion.div>
                                    <motion.div variants={cardItemVariants}><MetricCard icon="⚠️" label="Tasa de Morosidad" value={metrics.eficiencia.morosidad} unit="%" color="purple" /></motion.div>
                                </div>
                            </motion.section>

                            {/* Estructura de Capital */}
                            <motion.section variants={cardContainerVariants} initial="hidden" animate="visible">
                                <SectionHeader icon="📊" title="Estructura de Capital" />
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <motion.div variants={cardItemVariants}><MetricCard icon="💎" label="Activos Totales" value={metrics.capital.activosTotales} unit="M" color="red" /></motion.div>
                                    <motion.div variants={cardItemVariants}><MetricCard icon="🏛️" label="Patrimonio" value={metrics.capital.patrimonio} unit="M" color="red" /></motion.div>
                                    <motion.div variants={cardItemVariants}><MetricCard icon="📉" label="Pasivos Totales" value={metrics.capital.pasivos} unit="M" color="red" /></motion.div>
                                </div>
                            </motion.section>

                            {/* Calificación */}
                            <motion.section variants={cardItemVariants} initial="hidden" animate="visible">
                                <SectionHeader icon="⭐" title="Calificación de Riesgo" />
                                <div className="card">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="text-center">
                                            <p className="text-sm text-text-secondary font-medium mb-2">CALIFICACIÓN</p>
                                            <p className="text-4xl font-bold text-accent-secondary">{metrics.calificacion.rating || 'N/D'}</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-sm text-text-secondary font-medium mb-2">PERSPECTIVA</p>
                                            <p className="text-2xl font-semibold text-text-primary capitalize">{metrics.calificacion.perspectiva || 'N/D'}</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-sm text-text-secondary font-medium mb-2">ÚLTIMA CALIFICACIÓN</p>
                                            <p className="text-2xl font-semibold text-text-primary">{metrics.calificacion.fecha || 'N/D'}</p>
                                        </div>
                                    </div>
                                </div>
                            </motion.section>

                            {/* Footer Info */}
                            {metrics.chunksAnalyzed && (
                                <motion.div variants={cardItemVariants} initial="hidden" animate="visible" className="bg-bg-tertiary border border-border-subtle rounded-xl p-4 text-center text-sm text-text-secondary">
                                    <p>
                                        Métricas extraídas de <strong>{metrics.chunksAnalyzed}</strong> fragmentos de documentos
                                        {metrics.metadata?.fuente && <> • Fuente: <strong>{metrics.metadata.fuente}</strong></>}
                                    </p>
                                </motion.div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default MetricsStandardizer;
