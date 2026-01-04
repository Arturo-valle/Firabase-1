import React from 'react';
import type { IssuerMetrics } from '../types';
import { formatCurrency, formatPercentage, formatRatio } from '../utils/formatters';

interface ComparisonTableProps {
    issuers: IssuerMetrics[];
    highlightBest?: boolean;
}

import { motion } from 'framer-motion';

const ComparisonTable: React.FC<ComparisonTableProps> = ({ issuers, highlightBest = false }) => {
    if (!issuers || issuers.length === 0) return null;

    // Helper to safely access nested metrics
    const getMetricValue = (issuer: IssuerMetrics, section: keyof IssuerMetrics, key: string): number | undefined => {
        const sectionData = issuer[section];
        if (sectionData && typeof sectionData === 'object' && key in sectionData) {
            return (sectionData as any)[key] as number;
        }
        return undefined;
    };

    // Helper to find best value (max or min depending on metric)
    const isBest = (val: number | undefined, metricKey: string, section: keyof IssuerMetrics) => {
        if (!highlightBest || val === undefined) return false;

        const values = issuers.map(i => getMetricValue(i, section, metricKey))
            .filter(v => v !== undefined) as number[];

        if (values.length < 2) return false;

        const max = Math.max(...values);
        const min = Math.min(...values);

        // Lower is better for Debt/Equity
        if (metricKey === 'deudaPatrimonio') return val === min;

        // Higher is better for others (Assets, Income, ROE, Liquidity)
        return val === max;
    };

    const renderCell = (issuer: IssuerMetrics, section: keyof IssuerMetrics, key: string, formatter: (v: any) => string) => {
        const value = getMetricValue(issuer, section, key);
        const isWinner = isBest(value, key, section);

        return (
            <motion.td
                initial={false}
                animate={{
                    backgroundColor: isWinner ? 'rgba(0, 240, 255, 0.05)' : 'rgba(0, 0, 0, 0)',
                    color: isWinner ? '#00f0ff' : '#94a3b8'
                }}
                className={`p-4 text-right font-mono text-sm border-b border-white/5 ${isWinner ? 'font-bold' : ''}`}
            >
                {value !== undefined ? formatter(value) : '-'}
            </motion.td>
        );
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.05 }
        }
    };

    const rowVariants = {
        hidden: { opacity: 0, x: -10 },
        visible: { opacity: 1, x: 0 }
    };

    return (
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            <motion.table
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="w-full border-collapse"
            >
                <thead>
                    <tr>
                        <th className="p-4 text-left bg-black/80 backdrop-blur-md sticky left-0 z-20 min-w-[200px] border-b border-accent-primary/30 text-white font-bold">
                            Métrica Financiera
                        </th>
                        {issuers.map((issuer, idx) => (
                            <th key={idx} className="p-4 text-right bg-black/60 backdrop-blur-md min-w-[150px] border-b border-accent-primary/30 text-accent-primary font-mono text-sm tracking-wider">
                                {issuer.issuerName.split(' ')[0]} {/* Short name */}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {/* Capital Section */}
                    <motion.tr variants={rowVariants} className="bg-white/5">
                        <td colSpan={issuers.length + 1} className="p-2 pl-4 text-xs font-bold text-text-tertiary uppercase tracking-wider">
                            Capital & Activos
                        </td>
                    </motion.tr>
                    <motion.tr variants={rowVariants}>
                        <td className="p-4 bg-black/20 sticky left-0 text-text-primary text-sm font-medium">Activos Totales</td>
                        {issuers.map((i, idx) => <React.Fragment key={idx}>{renderCell(i, 'capital', 'activosTotales', formatCurrency)}</React.Fragment>)}
                    </motion.tr>
                    <motion.tr variants={rowVariants}>
                        <td className="p-4 bg-black/20 sticky left-0 text-text-primary text-sm font-medium">Pasivos Totales</td>
                        {issuers.map((i, idx) => <React.Fragment key={idx}>{renderCell(i, 'capital', 'pasivosTotales', formatCurrency)}</React.Fragment>)}
                    </motion.tr>
                    <motion.tr variants={rowVariants}>
                        <td className="p-4 bg-black/20 sticky left-0 text-text-primary text-sm font-medium">Patrimonio</td>
                        {issuers.map((i, idx) => <React.Fragment key={idx}>{renderCell(i, 'capital', 'patrimonio', formatCurrency)}</React.Fragment>)}
                    </motion.tr>

                    {/* Profitability Section */}
                    <motion.tr variants={rowVariants} className="bg-white/5">
                        <td colSpan={issuers.length + 1} className="p-2 pl-4 text-xs font-bold text-text-tertiary uppercase tracking-wider">
                            Rentabilidad
                        </td>
                    </motion.tr>
                    <motion.tr variants={rowVariants}>
                        <td className="p-4 bg-black/20 sticky left-0 text-text-primary text-sm font-medium">Utilidad Neta</td>
                        {issuers.map((i, idx) => <React.Fragment key={idx}>{renderCell(i, 'rentabilidad', 'utilidadNeta', formatCurrency)}</React.Fragment>)}
                    </motion.tr>
                    <motion.tr variants={rowVariants}>
                        <td className="p-4 bg-black/20 sticky left-0 text-text-primary text-sm font-medium">ROE</td>
                        {issuers.map((i, idx) => <React.Fragment key={idx}>{renderCell(i, 'rentabilidad', 'roe', formatPercentage)}</React.Fragment>)}
                    </motion.tr>
                    <motion.tr variants={rowVariants}>
                        <td className="p-4 bg-black/20 sticky left-0 text-text-primary text-sm font-medium">ROA</td>
                        {issuers.map((i, idx) => <React.Fragment key={idx}>{renderCell(i, 'rentabilidad', 'roa', formatPercentage)}</React.Fragment>)}
                    </motion.tr>

                    {/* Liquidez & Solvencia */}
                    <motion.tr variants={rowVariants} className="bg-white/5">
                        <td colSpan={issuers.length + 1} className="p-2 pl-4 text-xs font-bold text-text-tertiary uppercase tracking-wider">
                            Liquidez & Solvencia
                        </td>
                    </motion.tr>
                    <motion.tr variants={rowVariants}>
                        <td className="p-4 bg-black/20 sticky left-0 text-text-primary text-sm font-medium">Ratio Circulante</td>
                        {issuers.map((i, idx) => <React.Fragment key={idx}>{renderCell(i, 'liquidez', 'ratioCirculante', formatRatio)}</React.Fragment>)}
                    </motion.tr>
                    <motion.tr variants={rowVariants}>
                        <td className="p-4 bg-black/20 sticky left-0 text-text-primary text-sm font-medium">Deuda / Patrimonio</td>
                        {issuers.map((i, idx) => <React.Fragment key={idx}>{renderCell(i, 'solvencia', 'deudaPatrimonio', formatRatio)}</React.Fragment>)}
                    </motion.tr>
                </tbody>
            </motion.table>
        </div>
    );
};

export default ComparisonTable;
