import { useMemo, useState, useEffect } from 'react';
import { AgGridReact } from 'ag-grid-react'; // React Grid Logic
import "ag-grid-community/styles/ag-grid.css"; // Core CSS
import "ag-grid-community/styles/ag-theme-balham.css"; // Theme

import { ColDef, ModuleRegistry } from 'ag-grid-community';
import { ClientSideRowModelModule } from 'ag-grid-community';

// Register modules
ModuleRegistry.registerModules([ClientSideRowModelModule]);

interface MarketGridProps { }

// Mock Data Generator
const generateMarketData = () => {
    const tickers = ['BDF', 'BAC', 'LAFISE', 'BANPRO', 'FICOHSA', 'AVANZ', 'ISIS', 'NICO', 'AMOV', 'WALMART'];
    return tickers.map(ticker => ({
        symbol: ticker,
        price: (Math.random() * 100).toFixed(2),
        change: (Math.random() * 5 - 2.5).toFixed(2),
        volume: Math.floor(Math.random() * 100000),
        bid: (Math.random() * 100).toFixed(2),
        ask: (Math.random() * 100).toFixed(2),
    }));
};

export default function MarketGrid({ }: MarketGridProps) {
    const [rowData, setRowData] = useState(generateMarketData());

    // Column Definitions
    const colDefs = useMemo<ColDef[]>(() => [
        { field: 'symbol', headerName: 'Ticker', flex: 1, cellClass: 'font-bold text-accent-primary' },
        { field: 'price', headerName: 'Last', flex: 1, cellClass: 'font-mono text-right' },
        {
            field: 'change',
            headerName: 'Chg%',
            flex: 1,
            cellClass: 'font-mono text-right',
            cellStyle: (params) => {
                if (params.value > 0) return { color: 'var(--status-success)' };
                if (params.value < 0) return { color: 'var(--status-danger)' };
                return { color: 'var(--text-muted)' };
            }
        },
        { field: 'volume', headerName: 'Vol', flex: 1, cellClass: 'font-mono text-right text-text-secondary' },
    ], []);

    // Simulate Live Updates
    useEffect(() => {
        const interval = setInterval(() => {
            setRowData(prevData => {
                return prevData.map(item => ({
                    ...item,
                    price: (parseFloat(item.price) + (Math.random() - 0.5)).toFixed(2),
                    change: (parseFloat(item.change) + (Math.random() - 0.5) * 0.1).toFixed(2),
                }));
            });
        }, 1000); // 1 update per second for demo

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="h-full w-full ag-theme-balham-dark font-sans">
            {/* 
                We use 'ag-theme-balham-dark' for high density.
                We override some variable via CSS in index.css if needed to match our Slate theme exactly.
             */}
            <AgGridReact
                rowData={rowData}
                columnDefs={colDefs}
                defaultColDef={{
                    sortable: true,
                    filter: true,
                    resizable: true,
                    suppressMovable: true // Lock columns for simplicity
                }}
                animateRows={false} // Disable animation for performance in high-freq
                rowHeight={28} // Compact rows
                headerHeight={32}
            />
        </div>
    );
}
