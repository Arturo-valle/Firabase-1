import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface SparklineChartProps {
    data: number[];
    color?: string;
    height?: number;
    width?: string | number;
    showPositiveNegative?: boolean;
}

export default function SparklineChart({
    data,
    color,
    height = 50,
    width = '100%',
    showPositiveNegative = false
}: SparklineChartProps) {
    // Calculate if trend is positive or negative
    const isPositive = data[data.length - 1] >= data[0];
    const autoColor = showPositiveNegative
        ? (isPositive ? '#10b981' : '#ef4444')
        : (color || '#14b8a6');

    // Transform array into chart data format
    const chartData = data.map((value, index) => ({
        index,
        value,
    }));

    return (
        // @ts-ignore
        <ResponsiveContainer width={width} height={height}>
            <LineChart data={chartData}>
                <Line
                    type="monotone"
                    dataKey="value"
                    stroke={autoColor}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                />
            </LineChart>
        </ResponsiveContainer>
    );
}
