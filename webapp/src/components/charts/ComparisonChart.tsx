import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';

interface ComparisonData {
    date: string;
    [key: string]: string | number;
}

interface ComparisonChartProps {
    data: ComparisonData[];
    series: Array<{
        key: string;
        label: string;
        color: string;
    }>;
    title?: string;
    height?: number;
}

export default function ComparisonChart({
    data,
    series,
    title,
    height = 400
}: ComparisonChartProps) {
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-bg-elevated border border-border-emphasis rounded-lg p-3 shadow-elevated">
                    <p className="text-text-primary font-semibold mb-2">{label}</p>
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex items-center gap-2 mb-1">
                            <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: entry.color }}
                            />
                            <span className="text-text-secondary text-sm">{entry.name}:</span>
                            <span className="text-text-primary font-semibold">
                                {entry.value.toLocaleString()}
                            </span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="chart-container" style={{ height }}>
            {title && (
                <h4 className="text-text-primary font-semibold mb-4">{title}</h4>
            )}
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
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
                    <Legend
                        wrapperStyle={{
                            paddingTop: '20px',
                            fontSize: '14px'
                        }}
                        iconType="line"
                    />

                    {series.map((s) => (
                        <Line
                            key={s.key}
                            type="monotone"
                            dataKey={s.key}
                            name={s.label}
                            stroke={s.color}
                            strokeWidth={2}
                            dot={{ fill: s.color, r: 3 }}
                            activeDot={{ r: 5 }}
                        />
                    ))}
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
