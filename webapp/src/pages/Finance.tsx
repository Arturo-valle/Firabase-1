import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
    BuildingOfficeIcon,
    ChartBarIcon,
    ArrowRightIcon
} from '@heroicons/react/24/outline';
import { useFinanceData } from '../hooks/useFinanceData';
import ErrorDisplay from '../components/ErrorDisplay';

// En un escenario real, estas constantes vendrían de un archivo centralizado
const FINANCE_CONSTANTS = {
    COVERAGE_THRESHOLDS: {
        HIGH: 80,
        MEDIUM: 50
    }
};

export default function Finance() {
    const { issuers, stats, loading, error } = useFinanceData();

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                        className="w-12 h-12 border-4 border-accent-primary border-t-transparent rounded-full mx-auto mb-4"
                    />
                    <p className="text-text-secondary">Cargando emisores...</p>
                </div>
            </div>
        );
    }

    if (error || !stats) {
        return <ErrorDisplay error={error || new Error('Error al cargar datos del mercado')} onRetry={() => window.location.reload()} />;
    }

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    };

    return (
        <div className="space-y-6 pb-12">
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-6"
            >
                {/* Header */}
                <motion.div variants={itemVariants}>
                    <h2 className="text-3xl font-bold text-text-primary mb-2">
                        💹 Emisores Procesados
                    </h2>
                    <p className="text-text-secondary">
                        Análisis financiero detallado de {issuers.length} emisores activos
                    </p>
                </motion.div>

                {/* Stats Cards */}
                <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="card bg-accent-primary/10 border border-accent-primary/20">
                        <span className="text-accent-primary text-sm font-medium">Emisores Activos</span>
                        <p className="text-3xl font-bold text-text-primary mt-2">
                            {stats.totalIssuers}
                        </p>
                    </div>
                    <div className="card bg-status-success/10 border border-status-success/20">
                        <span className="text-status-success text-sm font-medium">Docs Procesados</span>
                        <p className="text-3xl font-bold text-text-primary mt-2">
                            {stats.totalProcessedDocs}
                        </p>
                    </div>
                    <div className="card bg-accent-secondary/10 border border-accent-secondary/20">
                        <span className="text-accent-secondary text-sm font-medium">Chunks en DB</span>
                        <p className="text-3xl font-bold text-text-primary mt-2">
                            {stats.totalChunks > 0
                                ? `${(stats.totalChunks / 1000).toFixed(1)}K`
                                : '0'
                            }
                        </p>
                    </div>
                    <div className="card bg-accent-tertiary/10 border border-accent-tertiary/20">
                        <span className="text-accent-tertiary text-sm font-medium">Cobertura</span>
                        <p className="text-3xl font-bold text-text-primary mt-2">
                            {Math.round(stats.overallCoverage)}%
                        </p>
                    </div>
                </motion.div>

                {/* Issuers List Section */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-text-primary">Listado de Emisores</h3>
                        <Link
                            to="/library"
                            className="text-accent-primary text-sm hover:underline flex items-center gap-1"
                        >
                            Ver biblioteca completa <ArrowRightIcon className="w-4 h-4" />
                        </Link>
                    </div>

                    {issuers.length > 0 ? (
                        <div className="grid grid-cols-1 gap-4">
                            {issuers.map((issuer) => (
                                <motion.div key={issuer.id} variants={itemVariants}>
                                    <Link
                                        to={`/issuer/${issuer.id}`}
                                        className="card bg-bg-elevated border border-border-subtle hover:border-accent-primary/30 transition-all group block"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-xl bg-bg-primary border border-border-subtle flex items-center justify-center overflow-hidden">
                                                    {issuer.logoUrl ? (
                                                        <img
                                                            src={issuer.logoUrl}
                                                            alt={issuer.name}
                                                            className="w-full h-full object-contain"
                                                        />
                                                    ) : (
                                                        <BuildingOfficeIcon className="w-6 h-6 text-text-tertiary" />
                                                    )}
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-text-primary group-hover:text-accent-primary transition-colors">
                                                        {issuer.name}
                                                    </h3>
                                                    <div className="flex items-center gap-3 mt-1">
                                                        <span className="text-xs font-mono text-accent-primary bg-accent-primary/10 px-2 py-0.5 rounded">
                                                            {issuer.acronym}
                                                        </span>
                                                        <span className="text-xs text-text-tertiary uppercase tracking-wider">
                                                            {issuer.sector}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="text-right hidden md:block">
                                                <div className="text-sm font-bold text-text-primary">
                                                    {issuer.processed} documentos
                                                </div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <div className="w-24 h-1.5 bg-bg-primary rounded-full overflow-hidden border border-border-subtle">
                                                        <div
                                                            className={`h-full rounded-full ${issuer.processed >= FINANCE_CONSTANTS.COVERAGE_THRESHOLDS.HIGH
                                                                ? 'bg-status-success'
                                                                : 'bg-accent-primary'
                                                                }`}
                                                            style={{ width: `${Math.min(issuer.coverage, 100)}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-[10px] text-text-tertiary font-mono">
                                                        {Math.round(issuer.coverage)}%
                                                    </span>
                                                </div>
                                            </div>

                                            <ArrowRightIcon className="w-5 h-5 text-text-tertiary group-hover:text-accent-primary transition-all group-hover:translate-x-1" />
                                        </div>
                                    </Link>
                                </motion.div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <BuildingOfficeIcon className="w-16 h-16 text-text-tertiary mx-auto mb-4" />
                            <p className="text-text-secondary">No hay emisores procesados aún</p>
                        </div>
                    )}
                </div>
            </motion.div>

            {/* Help Card */}
            <div className="card bg-accent-primary/10 border border-accent-primary/20">
                <div className="flex items-start gap-4">
                    <ChartBarIcon className="w-8 h-8 text-accent-primary flex-shrink-0" />
                    <div>
                        <h4 className="text-text-primary font-semibold mb-2">
                            ¿Cómo funcionan las Métricas?
                        </h4>
                        <p className="text-text-secondary text-sm mb-4">
                            Cada emisor tiene una página de detalle con métricas financieras extraídas usando IA de sus documentos procesados.
                            Click en cualquier emisor arriba para ver ratios de liquidez, rentabilidad, solvencia, y más.
                        </p>
                        <div className="flex gap-4 text-xs">
                            <div>
                                <span className="text-text-tertiary">Extracción:</span>
                                <span className="text-accent-primary font-semibold ml-1">Gemini 2.0 Flash</span>
                            </div>
                            <div>
                                <span className="text-text-tertiary">Precisión:</span>
                                <span className="text-accent-primary font-semibold ml-1">Alta (temperature 0.1)</span>
                            </div>
                            <div>
                                <span className="text-text-tertiary">Fuente:</span>
                                <span className="text-accent-primary font-semibold ml-1">Documentos Auditados</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
