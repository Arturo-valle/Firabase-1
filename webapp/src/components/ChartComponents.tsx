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

// Common chart options for dark theme
const commonOptions = {
    color: '#94a3b8', // text-slate-400
    borderColor: '#334155', // border-slate-700
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
                label: 'Calificación Crediticia',
                data: data.map(d => d.numericValue),
                borderColor: '#22bfa5', // accent-primary
                backgroundColor: 'rgba(34, 191, 165, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 6,
                pointHoverRadius: 8,
                pointBackgroundColor: '#22bfa5',
                pointBorderColor: '#1e293b', // bg-secondary
                pointBorderWidth: 2,
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false,
                labels: { color: commonOptions.color }
            },
            title: {
                display: true,
                text: `Tendencia de Calificación Crediticia${issuerName ? ` - ${issuerName}` : ''}`,
                font: {
                    size: 16,
                    weight: 'bold' as const,
                },
                color: '#e2e8f0', // text-primary
            },
            tooltip: {
                backgroundColor: '#1e293b',
                titleColor: '#e2e8f0',
                bodyColor: '#94a3b8',
                borderColor: '#334155',
                borderWidth: 1,
                callbacks: {
                    label: (context: any) => {
                        const dataPoint = data[context.dataIndex];
                        return `Calificación: ${dataPoint.rating}`;
                    },
                },
            },
        },
        scales: {
            y: {
                beginAtZero: false,
                min: 0,
                max: 10,
                ticks: {
                    color: commonOptions.color,
                    callback: (value: any) => {
                        const ratings = ['D', 'C', 'B-', 'B', 'BB-', 'BB', 'BBB-', 'BBB', 'A-', 'A', 'AA'];
                        return ratings[Math.floor(value)] || '';
                    },
                },
                grid: {
                    color: 'rgba(255, 255, 255, 0.05)',
                },
            },
            x: {
                ticks: { color: commonOptions.color },
                grid: {
                    display: false,
                },
            },
        },
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
                    'rgba(34, 191, 165, 0.8)', // accent-primary
                    'rgba(59, 130, 246, 0.8)', // blue
                    'rgba(168, 85, 247, 0.8)', // purple
                    'rgba(245, 158, 11, 0.8)', // orange
                    'rgba(239, 68, 68, 0.8)', // red
                ],
                borderColor: [
                    '#22bfa5',
                    '#3b82f6',
                    '#a855f7',
                    '#f59e0b',
                    '#ef4444',
                ],
                borderWidth: 1,
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false,
            },
            title: {
                display: true,
                text: `Ratios Financieros${issuerName ? ` - ${issuerName}` : ''}`,
                font: {
                    size: 16,
                    weight: 'bold' as const,
                },
                color: '#e2e8f0',
            },
            tooltip: {
                backgroundColor: '#1e293b',
                titleColor: '#e2e8f0',
                bodyColor: '#94a3b8',
                borderColor: '#334155',
                borderWidth: 1,
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
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: { color: commonOptions.color },
                grid: {
                    color: 'rgba(255, 255, 255, 0.05)',
                },
            },
            x: {
                ticks: { color: commonOptions.color },
                grid: {
                    display: false,
                },
            },
        },
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
                label: 'Score de Riesgo',
                data: data.map(d => d.score),
                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                borderColor: '#ef4444',
                borderWidth: 2,
                pointBackgroundColor: '#ef4444',
                pointBorderColor: '#1e293b',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: '#ef4444',
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false,
            },
            title: {
                display: true,
                text: `Perfil de Riesgo${issuerName ? ` - ${issuerName}` : ''}`,
                font: {
                    size: 16,
                    weight: 'bold' as const,
                },
                color: '#e2e8f0',
            },
            tooltip: {
                backgroundColor: '#1e293b',
                titleColor: '#e2e8f0',
                bodyColor: '#94a3b8',
                borderColor: '#334155',
                borderWidth: 1,
            },
        },
        scales: {
            r: {
                beginAtZero: true,
                min: 0,
                max: 10,
                ticks: {
                    stepSize: 2,
                    color: commonOptions.color,
                    backdropColor: 'transparent',
                },
                grid: {
                    color: 'rgba(255, 255, 255, 0.1)',
                },
                pointLabels: {
                    color: commonOptions.color,
                },
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

    // Get all unique metric names
    const metricNames = Array.from(
        new Set(data.flatMap(issuer => Object.keys(issuer.metrics)))
    );

    const colors = [
        'rgb(34, 191, 165)', // accent-primary
        'rgb(59, 130, 246)', // blue
        'rgb(168, 85, 247)', // purple
        'rgb(245, 158, 11)', // orange
        'rgb(236, 72, 153)', // pink
    ];

    const chartData = {
        labels: metricNames,
        datasets: data.map((issuer, index) => ({
            label: issuer.issuerName,
            data: metricNames.map(metric => issuer.metrics[metric] || 0),
            backgroundColor: colors[index % colors.length].replace('rgb', 'rgba').replace(')', ', 0.8)'),
            borderColor: colors[index % colors.length],
            borderWidth: 1,
        })),
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top' as const,
                labels: { color: commonOptions.color }
            },
            title: {
                display: true,
                text: 'Comparación entre Emisores',
                font: {
                    size: 16,
                    weight: 'bold' as const,
                },
                color: '#e2e8f0',
            },
            tooltip: {
                backgroundColor: '#1e293b',
                titleColor: '#e2e8f0',
                bodyColor: '#94a3b8',
                borderColor: '#334155',
                borderWidth: 1,
            },
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: { color: commonOptions.color },
                grid: {
                    color: 'rgba(255, 255, 255, 0.05)',
                },
            },
            x: {
                ticks: { color: commonOptions.color },
                grid: {
                    display: false,
                },
            },
        },
    };

    return (
        <div className="h-full w-full">
            <div style={{ height: '350px' }}>
                <Bar data={chartData} options={options} />
            </div>
        </div>
    );
};
