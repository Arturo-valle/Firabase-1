import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, AreaSeries } from 'lightweight-charts';
import { fetchIssuers, fetchIssuerHistory } from '../../utils/marketDataApi';

interface ProChartProps {
    symbol?: string; // Acronym, e.g. "BDF"
}

export default function ProChart({ symbol = "BDF" }: ProChartProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const seriesRef = useRef<ISeriesApi<"Area"> | null>(null); // Switching to Area for fundamentals
    const [loading, setLoading] = useState(true);
    const [noData, setNoData] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            if (!chartContainerRef.current) return;
            setLoading(true);
            setNoData(false);

            try {
                // 1. Resolve Symbol to ID
                // In a production app, we'd have a map or pass ID directly. 
                // For now, we fetch all to find the ID.
                const { issuers } = await fetchIssuers();
                const issuer = issuers.find(i => i.acronym === symbol || i.name.includes(symbol));

                if (!issuer) {
                    console.warn(`Issuer not found for symbol: ${symbol}`);
                    setNoData(true);
                    setLoading(false);
                    return;
                }

                // 2. Fetch History
                const history = await fetchIssuerHistory(issuer.id);

                // 3. Transform Data
                // Lightweight Charts expects { time, value } sorted by time
                const chartData = (history as any[])
                    .filter((item: any) => item.period && item.activosTotales > 0)
                    .sort((a: any, b: any) => (a.period || '').localeCompare(b.period || ''))
                    .map((item: any) => ({
                        time: item.period as string, // e.g. "2023-01"
                        value: item.activosTotales || 0
                    }));

                if (chartData.length === 0) {
                    setNoData(true);
                    setLoading(false);
                    return;
                }

                // Initialize Chart (if not exists)
                if (!chartRef.current) {
                    const chart = createChart(chartContainerRef.current, {
                        layout: {
                            background: { type: ColorType.Solid, color: '#161B22' }, // Slate Dark
                            textColor: '#C9D1D9',
                        },
                        grid: {
                            vertLines: { color: 'rgba(51, 65, 85, 0.4)' },
                            horzLines: { color: 'rgba(51, 65, 85, 0.4)' },
                        },
                        width: chartContainerRef.current.clientWidth,
                        height: chartContainerRef.current.clientHeight,
                        timeScale: {
                            borderColor: 'rgba(51, 65, 85, 0.8)',
                            timeVisible: true,
                        },
                        rightPriceScale: {
                            borderColor: 'rgba(51, 65, 85, 0.8)',
                            scaleMargins: {
                                top: 0.2, // Leave space for label
                                bottom: 0.1,
                            },
                        },
                    });

                    // Use Area Series for "Assets" (Fundamental Data)
                    const areaSeries = chart.addSeries(AreaSeries, {
                        lineColor: '#CBB26A', // Gold
                        topColor: 'rgba(203, 178, 106, 0.4)',
                        bottomColor: 'rgba(203, 178, 106, 0.0)',
                    });

                    seriesRef.current = areaSeries;
                    chartRef.current = chart;

                    const handleResize = () => {
                        if (chartContainerRef.current && chartRef.current) {
                            chartRef.current.applyOptions({
                                width: chartContainerRef.current.clientWidth,
                                height: chartContainerRef.current.clientHeight
                            });
                        }
                    };
                    const resizeObserver = new ResizeObserver(handleResize);
                    resizeObserver.observe(chartContainerRef.current);
                }

                // Update Data
                seriesRef.current?.setData(chartData);
                chartRef.current?.timeScale().fitContent();

            } catch (error) {
                console.error("Failed to load chart data", error);
                setNoData(true);
            } finally {
                setLoading(false);
            }
        };

        loadData();

        return () => {
            // Cleanup handled by ref checking or future improvements
        };
    }, [symbol]);

    return (
        <div className="w-full h-full relative group bg-bg-primary">
            {/* Chart Container */}
            <div ref={chartContainerRef} className="w-full h-full" />

            {/* Overlay Header */}
            <div className="absolute top-2 left-2 z-10 flex flex-col items-start pointer-events-none">
                <div className="flex items-center gap-2 bg-bg-secondary/90 backdrop-blur px-2 py-1 rounded border border-border-subtle">
                    <span className="font-mono font-bold text-accent-primary text-lg">{symbol}</span>
                    <span className="text-xs text-text-secondary">Total Assets (History)</span>
                </div>
            </div>

            {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-bg-primary/50 z-20">
                    <span className="text-accent-primary font-mono text-sm animate-pulse">LOADING CHART...</span>
                </div>
            )}
            {noData && !loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-bg-primary/50 z-20">
                    <span className="text-text-muted font-mono text-sm">NO MARKET DATA AVAILABLE</span>
                </div>
            )}
        </div>
    );
}
