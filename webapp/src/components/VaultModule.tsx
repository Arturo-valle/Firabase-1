import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { MagnifyingGlassIcon, BuildingLibraryIcon, GlobeAmericasIcon } from '@heroicons/react/24/outline';
import type { Issuer } from '../types';

interface VaultModuleProps {
    issuers?: Issuer[];
}

const VaultModule: React.FC<VaultModuleProps> = ({ issuers = [] }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredIssuers = issuers.filter((issuer) =>
        issuer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        issuer.acronym?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const containerVariants: Variants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants: Variants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.4, ease: "easeOut" }
        }
    };

    return (
        <motion.div
            initial="hidden"
            animate="visible"
            className="space-y-8 p-6"
        >
            {/* Hero Search Section */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative glass-panel rounded-2xl p-8 overflow-hidden text-center border border-white/5"
            >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-32 bg-accent-primary/10 blur-[100px] rounded-full pointer-events-none" />

                <h2 className="relative z-10 text-3xl font-bold text-white mb-2 tracking-tight">
                    Bóveda de Inteligencia
                </h2>
                <p className="relative z-10 text-text-secondary mb-8 max-w-lg mx-auto text-sm">
                    Acceda a perfiles financieros, reportes de riesgo y hechos relevantes de todos los emisores activos.
                </p>

                <div className="relative z-10 max-w-xl mx-auto group">
                    <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary group-focus-within:text-accent-primary transition-colors" />
                    <input
                        type="text"
                        placeholder="Buscar emisor por nombre o símbolo..."
                        className="
                            w-full pl-12 pr-4 py-4 bg-black/40 border border-white/10 rounded-xl
                            text-white placeholder:text-text-tertiary text-lg font-medium
                            focus:outline-none focus:border-accent-primary/50 focus:ring-1 focus:ring-accent-primary/20
                            transition-all shadow-lg
                        "
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </motion.div>

            {/* Grid */}
            <AnimatePresence mode="wait">
                {issuers.length === 0 ? (
                    <motion.div
                        key="empty"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.5 }}
                        exit={{ opacity: 0 }}
                        className="text-center py-20"
                    >
                        <BuildingLibraryIcon className="w-16 h-16 mx-auto mb-4 text-text-tertiary" />
                        <p className="text-text-secondary font-mono tracking-widest">SISTEMA SIN DATOS INDEXADOS</p>
                    </motion.div>
                ) : (
                    <motion.div
                        key="grid"
                        variants={containerVariants}
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
                    >
                        {filteredIssuers.map((issuer) => (
                            <motion.div key={issuer.id} variants={itemVariants}>
                                <Link
                                    to={`/issuer/${encodeURIComponent(issuer.id)}`}
                                    className="
                                        group relative bg-bg-tertiary/40 border border-white/5 hover:border-accent-primary/30 
                                        p-5 rounded-xl cursor-pointer transition-all duration-300 
                                        hover:shadow-glow-blue hover:bg-bg-tertiary/60 overflow-hidden block
                                    "
                                >
                                    <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-accent-primary/10 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity" />

                                    <div className="flex justify-between items-start mb-4 relative z-10">
                                        <div className="w-12 h-12 bg-white rounded-lg p-2 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-300">
                                            <img
                                                src={issuer.logoUrl || 'https://www.bolsanic.com/wp-content/uploads/2016/12/logo.png'}
                                                alt={issuer.name}
                                                className="max-w-full max-h-full object-contain filter contrast-125"
                                            />
                                        </div>
                                        {issuer.acronym && (
                                            <span className="text-[10px] font-mono font-bold text-accent-primary bg-accent-primary/10 border border-accent-primary/20 px-2 py-1 rounded tracking-tighter shadow-sm">
                                                {issuer.acronym}
                                            </span>
                                        )}
                                    </div>

                                    <h3 className="text-lg font-bold text-white group-hover:text-accent-primary transition-colors line-clamp-1 mb-1 tracking-tight">
                                        {issuer.name}
                                    </h3>

                                    <div className="flex items-center gap-2 text-xs text-text-secondary mb-4 font-medium italic">
                                        <GlobeAmericasIcon className="w-3 h-3 text-accent-secondary" />
                                        <span>{issuer.sector || 'Corporativo'}</span>
                                    </div>

                                    <div className="pt-4 border-t border-white/5 flex justify-between items-center text-[10px]">
                                        <span className="text-text-tertiary font-mono tracking-wider font-semibold">
                                            {issuer.documents?.length || 0} RECS
                                        </span>
                                        <span className="flex items-center gap-1 text-accent-primary bg-accent-primary/5 px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-all duration-300 font-bold translate-x-2 group-hover:translate-x-0">
                                            ACCESS <span className="text-xs">→</span>
                                        </span>
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default VaultModule;
