import React from 'react';
import type { IssuerMetrics } from '../types';

interface ComparisonTableProps {
    issuers: IssuerMetrics[];
    highlightBest?: boolean;
}

const ComparisonTable: React.FC<ComparisonTableProps> = ({ issuers, highlightBest = true }) => {
    if (issuers.length === 0) {
        return (
            <div className="card p-8 text-center border-dashed border-2 border-border-subtle bg-transparent">
                <p className="text-text-secondary">No hay emisores para comparar</p>
            </div>
        );
    }

    // Helper to find best/worst values
    const findBestWorst = (values: (number | null)[], higherIsBetter: boolean = true) => {
        const validValues = values.filter(v => v !== null) as number[];
        if (validValues.length === 0) return { best: null, worst: null };

        const best = higherIsBetter ? Math.max(...validValues) : Math.min(...validValues);
        const worst = higherIsBetter ? Math.min(...validValues) : Math.max(...validValues);

        return { best, worst };
    };

    const formatValue = (value: number | null, unit: string = ''): string => {
        if (value === null) return 'N/D';

        if (unit === '%') return `${value.toFixed(2)}%`;
        if (unit === 'M') return `${value.toLocaleString('es-NI', { maximumFractionDigits: 1 })}M`;
        if (unit === 'x') return `${value.toFixed(2)}x`;

        return value.toLocaleString('es-NI', { maximumFractionDigits: 2 });
    };

    const getCellClass = (value: number | null, bestValue: number | null, worstValue: number | null): string => {
        if (!highlightBest || value === null) return 'text-text-secondary';

        if (value === bestValue) {
            return 'bg-green-900/20 font-semibold text-green-400';
        } else if (value === worstValue && bestValue !== worstValue) {
            return 'bg-red-900/20 text-red-400';
        }

        return 'text-text-secondary';
    };

    // Metrics rows configuration
    const metrics = [
        {
            category: 'Liquidez', items: [
                { label: 'Ratio Circulante', key: 'liquidez.ratioCirculante', unit: 'x', higherIsBetter: true },
                { label: 'Prueba Ácida', key: 'liquidez.pruebaAcida', unit: 'x', higherIsBetter: true },
                { label: 'Capital de Trabajo', key: 'liquidez.capitalTrabajo', unit: 'M', higherIsBetter: true },
            ]
        },
        {
            category: 'Solvencia', items: [
                { label: 'Deuda / Activos', key: 'solvencia.deudaActivos', unit: '%', higherIsBetter: false },
                { label: 'Deuda / Patrimonio', key: 'solvencia.deudaPatrimonio', unit: 'x', higherIsBetter: false },
                { label: 'Cobertura de Intereses', key: 'solvencia.coberturIntereses', unit: 'x', higherIsBetter: true },
            ]
        },
        {
            category: 'Rentabilidad', items: [
                { label: 'ROE', key: 'rentabilidad.roe', unit: '%', higherIsBetter: true },
                { label: 'ROA', key: 'rentabilidad.roa', unit: '%', higherIsBetter: true },
                { label: 'Margen Neto', key: 'rentabilidad.margenNeto', unit: '%', higherIsBetter: true },
                { label: 'Utilidad Neta', key: 'rentabilidad.utilidadNeta', unit: 'M', higherIsBetter: true },
            ]
        },
        {
            category: 'Eficiencia', items: [
                { label: 'Rotación de Activos', key: 'eficiencia.rotacionActivos', unit: 'x', higherIsBetter: true },
                { label: 'Rotación de Cartera', key: 'eficiencia.rotacionCartera', unit: 'x', higherIsBetter: true },
                { label: 'Morosidad', key: 'eficiencia.morosidad', unit: '%', higherIsBetter: false },
            ]
        },
        {
            category: 'Capital', items: [
                { label: 'Activos Totales', key: 'capital.activosTotales', unit: 'M', higherIsBetter: true },
                { label: 'Patrimonio', key: 'capital.patrimonio', unit: 'M', higherIsBetter: true },
                { label: 'Pasivos', key: 'capital.pasivos', unit: 'M', higherIsBetter: false },
            ]
        },
    ];

    // Get nested value from object
    const getValue = (obj: any, path: string): number | null => {
        const keys = path.split('.');
        let value: any = obj;
        for (const key of keys) {
            value = value?.[key];
            if (value === undefined) return null;
        }
        return value;
    };

    return (
        <div className="card overflow-hidden border border-border-subtle">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border-subtle">
                    <thead className="bg-bg-tertiary sticky top-0">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">
                                Métrica
                            </th>
                            {issuers.map((issuer, idx) => (
                                <th key={idx} className="px-6 py-4 text-center text-xs font-bold text-text-secondary uppercase tracking-wider">
                                    <div className="flex flex-col">
                                        <span className="text-text-primary">{issuer.issuerName}</span>
                                        <span className="text-text-tertiary font-normal normal-case text-xs mt-1">
                                            {issuer.metadata?.periodo || ''}
                                        </span>
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-bg-primary divide-y divide-border-subtle">
                        {metrics.map((category, catIdx) => (
                            <React.Fragment key={catIdx}>
                                {/* Category Header */}
                                <tr className="bg-bg-tertiary/50">
                                    <td colSpan={issuers.length + 1} className="px-6 py-3 text-sm font-bold text-text-primary">
                                        {category.category}
                                    </td>
                                </tr>
                                {/* Metric Rows */}
                                {category.items.map((metric, metricIdx) => {
                                    const values = issuers.map(issuer => getValue(issuer, metric.key));
                                    const { best, worst } = findBestWorst(values, metric.higherIsBetter);

                                    return (
                                        <tr key={metricIdx} className="hover:bg-bg-tertiary/30 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-secondary">
                                                {metric.label}
                                            </td>
                                            {issuers.map((issuer, issuerIdx) => {
                                                const value = getValue(issuer, metric.key);
                                                const cellClass = getCellClass(value, best, worst);

                                                return (
                                                    <td
                                                        key={issuerIdx}
                                                        className={`px-6 py-4 whitespace-nowrap text-sm text-center ${cellClass}`}
                                                    >
                                                        {formatValue(value, metric.unit)}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })}
                            </React.Fragment>
                        ))}

                        {/* Calificación Row */}
                        <tr className="bg-bg-tertiary/50">
                            <td colSpan={issuers.length + 1} className="px-6 py-3 text-sm font-bold text-text-primary">
                                Calificación de Riesgo
                            </td>
                        </tr>
                        <tr className="hover:bg-bg-tertiary/30 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-secondary">
                                Rating
                            </td>
                            {issuers.map((issuer, idx) => (
                                <td key={idx} className="px-6 py-4 whitespace-nowrap text-sm text-center font-semibold text-accent-secondary">
                                    {issuer.calificacion.rating || 'N/D'}
                                </td>
                            ))}
                        </tr>
                        <tr className="hover:bg-bg-tertiary/30 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-secondary">
                                Perspectiva
                            </td>
                            {issuers.map((issuer, idx) => (
                                <td key={idx} className="px-6 py-4 whitespace-nowrap text-sm text-center capitalize text-text-primary">
                                    {issuer.calificacion.perspectiva || 'N/D'}
                                </td>
                            ))}
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Legend */}
            {highlightBest && (
                <div className="bg-bg-tertiary px-6 py-4 border-t border-border-subtle">
                    <div className="flex items-center gap-6 text-xs text-text-secondary">
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-green-900/20 border border-green-800/50 rounded"></div>
                            <span>Mejor valor</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-red-900/20 border border-red-800/50 rounded"></div>
                            <span>Valor menos favorable</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ComparisonTable;
