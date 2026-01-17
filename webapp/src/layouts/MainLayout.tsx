import { Layout, Model, TabNode, IJsonModel } from 'flexlayout-react';
import 'flexlayout-react/style/dark.css'; // Institutional Dark Theme base
import { useState } from 'react';

// Default "Institutional" Layout
// Left: Watchlist (MarketGrid)
// Center: Main Chart
// Bottom: Activity/News
const defaultLayout: IJsonModel = {
    global: {
        tabEnableClose: true,
        tabEnableRename: false,
        tabSetEnableMaximize: true,
    },
    borders: [],
    layout: {
        type: "row",
        weight: 100,
        children: [
            {
                type: "tabset",
                weight: 25,
                children: [
                    {
                        type: "tab",
                        name: "Market Watch",
                        component: "MarketGrid",
                        enableClose: false
                    }
                ]
            },
            {
                type: "row",
                weight: 75,
                children: [
                    {
                        type: "tabset",
                        weight: 70,
                        children: [
                            {
                                type: "tab",
                                name: "Chart (BDF)",
                                component: "ProChart",
                                config: { symbol: "BDF" }
                            },
                            {
                                type: "tab",
                                name: "Chart (BAC)",
                                component: "ProChart",
                                config: { symbol: "BAC" }
                            }
                        ]
                    },
                    {
                        type: "tabset",
                        weight: 30,
                        children: [
                            {
                                type: "tab",
                                name: "Market Depth",
                                component: "Depth"
                            },
                            {
                                type: "tab",
                                name: "News Feed",
                                component: "News"
                            }
                        ]
                    }
                ]
            }
        ]
    }
};

export default function MainLayout() {
    const [model] = useState(Model.fromJson(defaultLayout));

    const factory = (node: TabNode) => {
        const component = node.getComponent();
        const config = node.getConfig();

        // Placeholder components until Phase 2
        if (component === "MarketGrid") {
            return (
                <div className="h-full w-full bg-bg-secondary flex items-center justify-center border border-border-default rounded-sm">
                    <span className="text-text-secondary font-mono text-sm">GRID: AG-Grid Loading...</span>
                </div>
            );
        }

        if (component === "ProChart") {
            return (
                <div className="h-full w-full bg-bg-primary flex items-center justify-center border border-border-default rounded-sm relative">
                    <span className="text-accent-primary font-mono text-xl">CHART: {config?.symbol || 'N/A'}</span>
                    <div className="absolute bottom-2 right-2 text-xs text-text-muted">Lightweight Charts Canvas</div>
                </div>
            );
        }

        return (
            <div className="h-full w-full bg-bg-secondary flex items-center justify-center text-text-muted">
                {node.getName()}
            </div>
        );
    };

    return (
        <div className="h-screen w-screen bg-bg-primary flex flex-col overflow-hidden">
            {/* Minimal Top Bar (VS Code Style) */}
            <header className="h-10 bg-bg-secondary border-b border-border-subtle flex items-center px-4 justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <span className="text-accent-primary font-bold tracking-tight">CENTRA<span className="text-white">TERMINAL</span></span>
                    <nav className="flex gap-4 text-xs text-text-secondary">
                        <span className="hover:text-white cursor-pointer">File</span>
                        <span className="hover:text-white cursor-pointer">View</span>
                        <span className="hover:text-white cursor-pointer">Tools</span>
                        <span className="hover:text-white cursor-pointer">Help</span>
                    </nav>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-xs font-mono text-finance-positive">● Connected</span>
                    <div className="w-6 h-6 rounded-full bg-bg-elevated border border-border-default"></div>
                </div>
            </header>

            {/* Dockable Workspace */}
            <div className="flex-1 relative">
                <Layout
                    model={model}
                    factory={factory}
                />
            </div>
        </div>
    );
}
