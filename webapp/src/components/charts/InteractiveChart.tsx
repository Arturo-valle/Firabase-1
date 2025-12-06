import {
    LineChart,
    Line,
    Area,
    AreaChart,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';

interface InteractiveChartProps {
    data: Array<{
        date: string;
        value: number;
        label?: string;
    }>;
    title?: string;
    color?: string;
    showArea?: boolean;
    height?: number;
}

export default function InteractiveChart({
    data,
    title,
    color = '#14b8a6',
    showArea = true,
    height = 300
}: InteractiveChartProps) {
    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-bg-elevated border border-border-emphasis rounded-lg p-3 shadow-elevated">
                    <p className="text-text-primary font-semibold mb-1">
                        {payload[0].payload.date}
                    </p>
                    <p className="text-accent-primary text-lg font-bold">
                        {payload[0].value.toLocaleString('es-NI', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                        })}
                    </p>
                    {payload[0].payload.label && (
                        <p className="text-text-secondary text-sm mt-1">
                            {payload[0].payload.label}
                        </p>
                    )}
                </div>
            );
        }
        return null;
    };

    const ChartComponent = showArea ? AreaChart : LineChart;

    return (
        <div className="chart-container" style={{ height }}>
            {title && (
                <h4 className="text-text-primary font-semibold mb-4">{title}</h4>
            )}
            <ResponsiveContainer width="100%" height="100%">
                <ChartComponent data={data}>
                    <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={color} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
                    <XAxis
                        dataKey="date"
                        stroke="#6b6b6b"
                        tick={{ fill: '#6b6b6b', fontSize: 12 }}
                    />
                    <YAxis
                        stroke="#6b6b6b"
                        tick={{ fill: '#6b6b6b', fontSize: 12 }}
                        tickFormatter={(value) => value.toLocaleString()}
                    />
                    <Tooltip content={<CustomTooltip />} />

                    {showArea ? (
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke={color}
                            strokeWidth={2}
                            fill="url(#colorValue)"
                        />
                    ) : (
                        <Line
                            type="monotone"
                            dataKey="value"
                            stroke={color}
                            strokeWidth={2}
                            dot={{ fill: color, r: 4 }}
                            activeDot={{ r: 6, fill: color }}
                        />
                    )}
                </ChartComponent>
            </ResponsiveContainer>
        </div>
    );
}
