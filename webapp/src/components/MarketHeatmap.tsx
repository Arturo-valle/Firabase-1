import { motion } from 'framer-motion';
import type { Issuer } from '../types';

interface MarketHeatmapProps {
    issuers: Issuer[];
    onIssuerClick: (id: string) => void;
}

export default function MarketHeatmap({ issuers, onIssuerClick }: MarketHeatmapProps) {
    // Sort by activity (doc count)
    const sorted = [...issuers].sort((a, b) => (b.documents?.length || 0) - (a.documents?.length || 0));

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 h-full overflow-y-auto pr-2 custom-scrollbar">
            {sorted.map((issuer, idx) => {
                const docCount = issuer.documents?.length || 0;
                // Calculate intensity based on max docs (assuming ~50 is high)
                const intensity = Math.min(1, docCount / 30);

                return (
                    <motion.div
                        key={issuer.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.05 }}
                        onClick={() => onIssuerClick(issuer.id)}
                        className={`
                            relative p-4 rounded-xl cursor-pointer overflow-hidden group
                            border border-white/5 hover:border-accent-primary/50 transition-all duration-300
                            hover:shadow-lg hover:shadow-accent-primary/10
                        `}
                        style={{
                            backgroundColor: issuer.sector === 'Banca'
                                ? `rgba(30, 58, 138, ${0.3 + intensity * 0.4})` // Blue
                                : issuer.sector === 'Industria'
                                    ? `rgba(6, 78, 59, ${0.3 + intensity * 0.4})` // Emerald
                                    : `rgba(30, 41, 59, ${0.4 + intensity * 0.4})` // Slate
                        }}
                    >
                        {/* Hover Gradient */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                        <div className="relative z-10 flex flex-col h-full justify-between">
                            <div>
                                <div className="flex justify-between items-start">
                                    <h4 className="font-bold text-lg text-white group-hover:text-accent-primary truncate tracking-tight">
                                        {issuer.acronym || issuer.name.substring(0, 4).toUpperCase()}
                                    </h4>
                                    {docCount > 20 && (
                                        <span className="flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-accent-primary opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-primary"></span>
                                        </span>
                                    )}
                                </div>
                                <p className="text-[10px] text-gray-300 truncate opacity-80 mt-1">{issuer.name}</p>
                            </div>

                            <div className="mt-3 flex items-end justify-between">
                                <div className="flex items-baseline gap-1">
                                    <span className="text-2xl font-mono font-bold text-white/95 tracking-tighter">
                                        {docCount}
                                    </span>
                                    <span className="text-[10px] text-gray-400 font-medium uppercase">docs</span>
                                </div>

                                <div className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-black/40 text-gray-300 border border-white/10">
                                    {issuer.sector}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );
}
