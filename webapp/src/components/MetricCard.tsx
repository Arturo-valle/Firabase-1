import React from 'react';

export interface MetricCardProps {
    icon: string;
    label: string;
    value: number | string | null;
    unit?: string;
    trend?: 'up' | 'down' | 'neutral';
    color?: string;
    subtitle?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
    icon,
    label,
    value,
    unit = '',
    trend,
    color = 'blue',
    subtitle
}) => {
    const colorClasses = {
        blue: 'bg-accent-secondary/10 border-accent-secondary/50 text-accent-secondary',
        green: 'bg-accent-primary/10 border-accent-primary/50 text-accent-primary',
        amber: 'bg-amber-900/10 border-amber-800/50 text-amber-400',
        purple: 'bg-purple-900/10 border-purple-800/50 text-purple-400',
        red: 'bg-red-900/10 border-red-800/50 text-red-400',
        indigo: 'bg-indigo-900/10 border-indigo-800/50 text-indigo-400',
    };

    const iconBgClasses = {
        blue: 'bg-accent-secondary/20',
        green: 'bg-accent-primary/20',
        amber: 'bg-amber-900/30',
        purple: 'bg-purple-900/30',
        red: 'bg-red-900/30',
        indigo: 'bg-indigo-900/30',
    };

    const formatValue = (val: number | string | null): string => {
        if (val === null || val === undefined) return 'N/D';

        if (typeof val === 'string') return val;

        if (unit === '%') {
            return `${val.toFixed(2)}%`;
        } else if (unit === 'M') {
            return `${val.toLocaleString('es-NI', { maximumFractionDigits: 1 })}M`;
        } else if (unit === 'x') {
            return `${val.toFixed(2)}x`;
        }

        return val.toLocaleString('es-NI', { maximumFractionDigits: 2 });
    };

    const getTrendIcon = () => {
        if (!trend || value === null) return null;

        if (trend === 'up') {
            return <span className="text-green-400 text-xl ml-2">↑</span>;
        } else if (trend === 'down') {
            return <span className="text-red-400 text-xl ml-2">↓</span>;
        }
        return <span className="text-text-tertiary text-xl ml-2">→</span>;
    };

    return (
        <div className={`rounded-xl border p-4 transition-all duration-200 hover:shadow-glow ${colorClasses[color as keyof typeof colorClasses] || colorClasses.blue}`}>
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-1">
                        {label}
                    </p>
                    <div className="flex items-baseline">
                        <p className={`text-2xl font-bold ${value === null ? 'text-text-disabled' : ''}`}>
                            {formatValue(value)}
                        </p>
                        {getTrendIcon()}
                    </div>
                    {subtitle && (
                        <p className="text-xs text-text-tertiary mt-1">{subtitle}</p>
                    )}
                </div>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${iconBgClasses[color as keyof typeof iconBgClasses] || iconBgClasses.blue}`}>
                    <span className="text-2xl">{icon}</span>
                </div>
            </div>
        </div>
    );
};

export default MetricCard;
