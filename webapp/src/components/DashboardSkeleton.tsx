/**
 * Componente Skeleton para el Dashboard Financiero.
 * Imita la estructura del FinancialDashboard para una transición de carga fluida.
 */
export function DashboardSkeleton() {
    return (
        <div className="min-h-screen bg-bg-primary p-6 animate-pulse">
            {/* Header Skeleton */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <div className="h-8 w-64 bg-text-muted/20 rounded-lg mb-2 flex items-center px-3 text-[10px] text-text-muted/30 font-medium uppercase tracking-wider">
                        Cargando Terminal...
                    </div>
                    <div className="flex gap-4">
                        <div className="h-4 w-24 bg-text-muted/10 rounded" />
                        <div className="h-4 w-32 bg-text-muted/10 rounded" />
                    </div>
                </div>
                <div className="h-10 w-48 bg-text-muted/20 rounded-full" />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                {/* Main Content Area (Left/Center) */}
                <div className="xl:col-span-3 space-y-6">
                    {/* Market Summary Bar Skeleton */}
                    <div className="h-12 bg-bg-secondary/50 rounded-xl border border-white/5 w-full" />

                    {/* Hero Section (Charts & Key Metrics) */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 h-[400px] bg-bg-secondary/40 rounded-2xl border border-white/5" />
                        <div className="space-y-6">
                            <div className="h-[190px] bg-bg-secondary/40 rounded-2xl border border-white/5" />
                            <div className="h-[190px] bg-bg-secondary/40 rounded-2xl border border-white/5" />
                        </div>
                    </div>

                    {/* Issuer Selector Skeleton */}
                    <div className="space-y-4">
                        <div className="h-6 w-40 bg-text-muted/20 rounded ml-2" />
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-4">
                            {[...Array(7)].map((_, i) => (
                                <div key={i} className="h-24 bg-bg-secondary/30 rounded-xl border border-white/5" />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Sidebar Skeleton (Right) */}
                <div className="xl:col-span-1 space-y-6">
                    <div className="flex justify-between items-center mb-4">
                        <div className="h-6 w-32 bg-text-muted/20 rounded" />
                        <div className="h-4 w-16 bg-text-muted/10 rounded" />
                    </div>
                    <div className="space-y-4">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="flex justify-between items-center p-3 bg-bg-secondary/20 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-text-muted/10" />
                                    <div className="space-y-2">
                                        <div className="h-3 w-16 bg-text-muted/20 rounded" />
                                        <div className="h-2 w-10 bg-text-muted/10 rounded" />
                                    </div>
                                </div>
                                <div className="h-4 w-12 bg-text-muted/20 rounded" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default DashboardSkeleton;
