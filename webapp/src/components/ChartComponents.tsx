import React from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    RadialLinearScale,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler,
} from 'chart.js';
import { Line, Bar, Radar } from 'react-chartjs-2';
import type {
    CreditRatingDataPoint,
    FinancialRatio,
    RiskScore,
    ComparativeData,
} from '../utils/dataParser';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    RadialLinearScale,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

// NicaBloomberg Theme Config
const theme = {
    colors: {
        primary: '#00F0FF',   // Cyan
        secondary: '#7000FF', // Purple
        accent: '#00FF94',    // Green
        danger: '#FF003C',    // Red
        warn: '#FFE600',      // Yellow
        text: '#94a3b8',      // Slate 400
        grid: 'rgba(255, 255, 255, 0.1)',
        tooltipBg: 'rgba(11, 14, 20, 0.95)',
        tooltipBorder: 'rgba(0, 240, 255, 0.3)',
    },
    fonts: {
        family: "'JetBrains Mono', monospace",
    }
};

// Common chart options for dark theme
const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            display: false,
            labels: {
                color: theme.colors.text,
                font: { family: theme.fonts.family, size: 10 }
            }
        },
        title: {
            display: true,
            color: '#ffffff',
            font: { family: theme.fonts.family, size: 14, weight: 'bold' as const },
            padding: { bottom: 20 }
        },
        tooltip: {
            backgroundColor: theme.colors.tooltipBg,
            titleColor: theme.colors.primary,
            bodyColor: '#ffffff',
            borderColor: theme.colors.tooltipBorder,
            borderWidth: 1,
            titleFont: { family: theme.fonts.family, size: 12 },
            bodyFont: { family: theme.fonts.family, size: 11 },
            padding: 10,
            cornerRadius: 8,
            displayColors: true,
            boxWidth: 8,
            boxHeight: 8,
            callbacks: {
                labelColor: (context: any) => ({
                    borderColor: 'transparent',
                    backgroundColor: context.dataset.borderColor,
                    borderWidth: 0,
                })
            }
        },
    },
    scales: {
        x: {
            ticks: { color: theme.colors.text, font: { family: theme.fonts.family, size: 10 } },
            grid: { display: false }
        },
        y: {
            ticks: { color: theme.colors.text, font: { family: theme.fonts.family, size: 10 } },
            grid: { color: theme.colors.grid, drawBorder: false }
        }
    }
};

interface CreditRatingChartProps {
    data: CreditRatingDataPoint[];
    issuerName?: string;
}

export const CreditRatingChart: React.FC<CreditRatingChartProps> = ({ data, issuerName }) => {
    const chartData = {
        labels: data.map(d => d.date),
        datasets: [
            {
                label: 'Calificación',
                data: data.map(d => d.numericValue),
                borderColor: theme.colors.primary,
                backgroundColor: 'rgba(0, 240, 255, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointHoverRadius: 6,
                pointBackgroundColor: '#000',
                pointBorderColor: theme.colors.primary,
                pointBorderWidth: 2,
            },
        ],
    };

    const options = {
        ...commonOptions,
        plugins: {
            ...commonOptions.plugins,
            title: { ...commonOptions.plugins.title, text: `TENDENCIA_CREDITICIA // ${issuerName || 'GENERAL'}` },
            tooltip: {
                ...commonOptions.plugins.tooltip,
                callbacks: {
                    label: (context: any) => {
                        const dataPoint = data[context.dataIndex];
                        return `RATING: ${dataPoint.rating}`;
                    },
                },
            }
        },
        scales: {
            ...commonOptions.scales,
            y: {
                ...commonOptions.scales.y,
                min: 0,
                max: 10,
                ticks: {
                    ...commonOptions.scales.y.ticks,
                    callback: (value: any) => {
                        const ratings = ['D', 'C', 'B-', 'B', 'BB-', 'BB', 'BBB-', 'BBB', 'A-', 'A', 'AA'];
                        return ratings[Math.floor(value)] || '';
                    },
                },
            }
        }
    };

    return (
        <div className="h-full w-full">
            <div style={{ height: '300px' }}>
                <Line data={chartData} options={options} />
            </div>
        </div>
    );
};

interface FinancialRatiosChartProps {
    data: FinancialRatio[];
    issuerName?: string;
}

export const FinancialRatiosChart: React.FC<FinancialRatiosChartProps> = ({ data, issuerName }) => {
    const chartData = {
        labels: data.map(d => d.name),
        datasets: [
            {
                label: 'Valor',
                data: data.map(d => d.value),
                backgroundColor: [
                    'rgba(0, 240, 255, 0.6)', // Cyan
                    'rgba(112, 0, 255, 0.6)', // Purple
                    'rgba(0, 255, 148, 0.6)', // Green
                    'rgba(255, 230, 0, 0.6)', // Yellow
                    'rgba(255, 0, 60, 0.6)',  // Red
                ],
                borderColor: [
                    theme.colors.primary,
                    theme.colors.secondary,
                    theme.colors.accent,
                    theme.colors.warn,
                    theme.colors.danger,
                ],
                borderWidth: 1,
            },
        ],
    };

    const options = {
        ...commonOptions,
        plugins: {
            ...commonOptions.plugins,
            title: { ...commonOptions.plugins.title, text: `MÉTRICAS_CLAVE // ${issuerName || 'GENERAL'}` },
            tooltip: {
                ...commonOptions.plugins.tooltip,
                callbacks: {
                    label: (context: any) => {
                        const value = context.parsed.y;
                        const name = data[context.dataIndex].name;
                        if (name.includes('%') || name.toLowerCase().includes('margen') || name === 'ROE' || name === 'ROA') {
                            return `${value.toFixed(2)}%`;
                        }
                        return value.toFixed(2);
                    },
                },
            },
        }
    };

    return (
        <div className="h-full w-full">
            <div style={{ height: '300px' }}>
                <Bar data={chartData} options={options} />
            </div>
        </div>
    );
};

interface RiskAssessmentChartProps {
    data: RiskScore[];
    issuerName?: string;
}

export const RiskAssessmentChart: React.FC<RiskAssessmentChartProps> = ({ data, issuerName }) => {
    const chartData = {
        labels: data.map(d => d.category),
        datasets: [
            {
                label: 'Score',
                data: data.map(d => d.score),
                backgroundColor: 'rgba(255, 0, 60, 0.2)', // Red glow
                borderColor: theme.colors.danger,
                borderWidth: 2,
                pointBackgroundColor: '#000',
                pointBorderColor: theme.colors.danger,
                pointHoverBackgroundColor: theme.colors.danger,
                pointHoverBorderColor: '#fff',
            },
        ],
    };

    const options = {
        ...commonOptions,
        plugins: {
            ...commonOptions.plugins,
            title: { ...commonOptions.plugins.title, text: `PERFIL_RIESGO // ${issuerName || 'GENERAL'}` },
        },
        scales: {
            r: {
                beginAtZero: true,
                min: 0,
                max: 10,
                ticks: {
                    stepSize: 2,
                    color: theme.colors.text,
                    backdropColor: 'transparent',
                    font: { family: theme.fonts.family, size: 9 }
                },
                grid: {
                    color: theme.colors.grid,
                },
                pointLabels: {
                    color: '#fff',
                    font: { family: theme.fonts.family, size: 10 }
                },
                angleLines: {
                    color: theme.colors.grid
                }
            },
        },
    };

    return (
        <div className="h-full w-full">
            <div style={{ height: '350px' }}>
                <Radar data={chartData} options={options} />
            </div>
        </div>
    );
};

interface ComparativeChartProps {
    data: ComparativeData[];
}

export const ComparativeChart: React.FC<ComparativeChartProps> = ({ data }) => {
    if (data.length === 0) return null;

    const metricNames = Array.from(
        new Set(data.flatMap(issuer => Object.keys(issuer.metrics)))
    );

    const colors = [
        theme.colors.primary,
        theme.colors.secondary,
        theme.colors.accent,
        theme.colors.warn,
        theme.colors.danger,
    ];

    const chartData = {
        labels: metricNames,
        datasets: data.map((issuer, index) => ({
            label: issuer.issuerName,
            data: metricNames.map(metric => issuer.metrics[metric] || 0),
            backgroundColor: [
                'rgba(0, 240, 255, 0.8)',
                'rgba(112, 0, 255, 0.8)',
                'rgba(0, 255, 148, 0.8)',
                'rgba(255, 230, 0, 0.8)',
                'rgba(255, 0, 60, 0.8)'
            ][index % 5],
            borderColor: colors[index % colors.length],
            borderWidth: 1,
        })),
    };

    const options = {
        ...commonOptions,
        plugins: {
            ...commonOptions.plugins,
            title: { ...commonOptions.plugins.title, text: 'MATRIZ_COMPARATIVA' },
            legend: {
                display: true,
                labels: {
                    color: theme.colors.text,
                    font: { family: theme.fonts.family, size: 10 },
                    boxWidth: 10
                }
            }
        }
    };

    return (
        <div className="h-full w-full">
            <div style={{ height: '350px' }}>
                <Bar data={chartData} options={options} />
            </div>
        </div>
    );
};
