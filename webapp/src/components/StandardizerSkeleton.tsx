

/**
 * Skeleton loader for the Standardizer module.
 * Provides a shimmering placeholder that matches the layout.
 */
export function StandardizerSkeleton({ hideHeader = false }: { hideHeader?: boolean }) {
    return (
        <div className={`p-6 max-w-7xl mx-auto animate-pulse ${hideHeader ? 'p-0' : ''}`}>
            {/* Header Skeleton */}
            {!hideHeader && (
                <div className="mb-8">
                    <div className="h-10 w-64 bg-text-muted/20 rounded-lg mb-2" />
                    <div className="h-6 w-96 bg-text-muted/10 rounded-lg" />
                </div>
            )}

            {/* Selector Skeleton */}
            {!hideHeader && (
                <div className="card mb-6 p-6">
                    <div className="h-4 w-32 bg-text-muted/20 rounded mb-4" />
                    <div className="flex gap-4 items-end">
                        <div className="h-12 flex-1 bg-bg-tertiary rounded-xl border border-white/5" />
                        <div className="h-12 w-40 bg-text-muted/20 rounded-xl" />
                    </div>
                </div>
            )}

            {/* Metrics Content Skeleton */}
            <div className="space-y-12">
                {/* Metadata Panel */}
                <div className="h-24 bg-bg-tertiary/50 rounded-xl border border-white/5" />

                {/* Grid Sections */}
                {[...Array(3)].map((_, i) => (
                    <div key={i}>
                        <div className="h-8 w-48 bg-text-muted/20 rounded mb-6" />
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {[1, 2, 3].map((j) => (
                                <div key={j} className="h-32 bg-bg-secondary/40 rounded-2xl border border-white/5" />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default StandardizerSkeleton;
