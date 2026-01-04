import React from 'react';

const LibrarySkeleton: React.FC = () => {
    return (
        <div className="space-y-8 p-6 animate-pulse">
            {/* Hero Search Section Skeleton */}
            <div className="relative bg-bg-tertiary/30 border border-white/5 rounded-2xl p-8 overflow-hidden text-center">
                <div className="w-1/3 h-8 bg-white/5 rounded-lg mx-auto mb-4" />
                <div className="w-1/2 h-4 bg-white/5 rounded-md mx-auto mb-8" />
                <div className="max-w-xl mx-auto h-14 bg-black/40 border border-white/5 rounded-xl shadow-lg" />
            </div>

            {/* Grid Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {[...Array(8)].map((_, i) => (
                    <div
                        key={i}
                        className="bg-black/20 border border-white/5 p-5 rounded-xl h-48 relative overflow-hidden"
                    >
                        {/* Header skeleton */}
                        <div className="flex justify-between items-start mb-6">
                            <div className="w-12 h-12 bg-white/10 rounded-lg shadow-inner" />
                            <div className="w-16 h-5 bg-accent-primary/10 rounded border border-white/5" />
                        </div>

                        {/* Content skeleton */}
                        <div className="w-3/4 h-6 bg-white/10 rounded mb-2" />
                        <div className="w-1/2 h-3 bg-white/5 rounded" />

                        {/* Footer skeleton */}
                        <div className="absolute bottom-5 left-5 right-5 pt-4 border-t border-white/5 flex justify-between items-center">
                            <div className="w-12 h-3 bg-white/5 rounded" />
                            <div className="w-16 h-3 bg-white/5 rounded" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default LibrarySkeleton;
