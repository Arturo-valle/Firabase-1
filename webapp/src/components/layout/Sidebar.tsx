import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    HomeIcon,
    MagnifyingGlassIcon,
    BookOpenIcon,
    ChartBarIcon,
    SparklesIcon,
    Cog6ToothIcon,
    UserIcon,
} from '@heroicons/react/24/outline';

interface NavItem {
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    route: string;
    badge?: string;
}

const navItems: NavItem[] = [
    { id: 'home', label: 'Inicio', icon: HomeIcon, route: '/' },
    { id: 'discover', label: 'Descubrir', icon: MagnifyingGlassIcon, route: '/discover' },
    { id: 'library', label: 'Biblioteca', icon: BookOpenIcon, route: '/library' },
    { id: 'finance', label: 'Finanzas', icon: ChartBarIcon, route: '/finance' },
    { id: 'standardizer', label: 'Métricas', icon: ChartBarIcon, route: '/standardizer', badge: 'New' },
    { id: 'comparator', label: 'Comparador', icon: ChartBarIcon, route: '/comparator', badge: 'New' },
    { id: 'ai', label: 'AI Assistant', icon: SparklesIcon, route: '/ai', badge: 'New' },
];

const bottomNavItems: NavItem[] = [
    { id: 'settings', label: 'Configuración', icon: Cog6ToothIcon, route: '/settings' },
    { id: 'profile', label: 'Perfil', icon: UserIcon, route: '/profile' },
];

export default function Sidebar() {
    const location = useLocation();
    const [isExpanded, setIsExpanded] = useState(false);

    const isActive = (route: string) => location.pathname === route;

    return (
        <motion.div
            initial={false}
            animate={{ width: isExpanded ? 240 : 80 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={`
                fixed left-3 top-3 bottom-3 
                glass-panel
                z-50 shadow-2xl shadow-black/50
                flex flex-col justify-between py-6
                overflow-hidden
            `}
            onMouseEnter={() => setIsExpanded(true)}
            onMouseLeave={() => setIsExpanded(false)}
        >
            {/* Logo */}
            <div className={`flex items-center px-5 mb-8 ${isExpanded ? 'justify-start' : 'justify-center'}`}>
                <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-10 h-10 bg-gradient-to-br from-accent-primary to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-accent-primary/20 flex-shrink-0 z-10"
                >
                    <span className="text-white font-bold text-xl font-mono">C</span>
                </motion.div>
                <AnimatePresence>
                    {isExpanded && (
                        <motion.span
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            className="ml-3 text-text-primary font-bold text-xl tracking-tight whitespace-nowrap"
                        >
                            Centra<span className="text-accent-primary">Capital</span>
                        </motion.span>
                    )}
                </AnimatePresence>
            </div>

            {/* Navigation Items */}
            <nav className="flex-1 px-3 space-y-2 overflow-y-auto custom-scrollbar">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.route);

                    return (
                        <Link key={item.id} to={item.route}>
                            <motion.div
                                layout
                                className={`
                                    flex items-center px-3 py-3 rounded-xl
                                    relative group cursor-pointer
                                    ${active ? 'text-accent-primary font-bold' : 'text-text-secondary hover:text-text-primary'}
                                    ${!isExpanded && 'justify-center'}
                                `}
                            >
                                {active && (
                                    <motion.div
                                        layoutId="activeTab"
                                        className="absolute inset-0 bg-accent-primary/10 border border-accent-primary/20 rounded-xl"
                                        initial={false}
                                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                    />
                                )}

                                <Icon className={`w-6 h-6 flex-shrink-0 z-10 ${active ? 'animate-pulse-slow' : ''}`} />

                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -10 }}
                                            className="ml-3 text-sm z-10 flex-1 flex justify-between items-center"
                                        >
                                            <span>{item.label}</span>
                                            {item.badge && (
                                                <span className="text-[10px] bg-accent-secondary/10 text-accent-secondary px-2 py-0.5 rounded-full border border-accent-secondary/20">
                                                    {item.badge}
                                                </span>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Tooltip for collapsed state */}
                                {!isExpanded && (
                                    <div className="
                                        absolute left-full ml-4 px-3 py-2 bg-bg-elevated/90 backdrop-blur border border-border-subtle rounded-lg
                                        text-text-primary text-xs font-medium whitespace-nowrap
                                        opacity-0 group-hover:opacity-100 pointer-events-none
                                        transition-all duration-200 translate-x-2 group-hover:translate-x-0 z-50 shadow-lg
                                    ">
                                        {item.label}
                                    </div>
                                )}
                            </motion.div>
                        </Link>
                    );
                })}
            </nav>

            {/* Bottom Navigation */}
            <div className="px-3 pt-4 mt-4 border-t border-border-subtle space-y-2">
                {bottomNavItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.route);

                    return (
                        <Link key={item.id} to={item.route}>
                            <motion.div
                                layout
                                className={`
                                    flex items-center px-3 py-3 rounded-xl
                                    relative group cursor-pointer
                                    ${active ? 'text-accent-primary font-bold' : 'text-text-secondary hover:text-text-primary'}
                                    ${!isExpanded && 'justify-center'}
                                `}
                            >
                                {active && (
                                    <motion.div
                                        layoutId="activeTabBottom"
                                        className="absolute inset-0 bg-accent-primary/10 border border-accent-primary/20 rounded-xl"
                                        initial={false}
                                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                    />
                                )}

                                <Icon className="w-6 h-6 flex-shrink-0 z-10" />

                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -10 }}
                                            className="ml-3 text-sm z-10"
                                        >
                                            {item.label}
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Tooltip for collapsed state */}
                                {!isExpanded && (
                                    <div className="
                                        absolute left-full ml-4 px-3 py-2 bg-bg-elevated/90 backdrop-blur border border-border-subtle rounded-lg
                                        text-text-primary text-xs font-medium whitespace-nowrap
                                        opacity-0 group-hover:opacity-100 pointer-events-none
                                        transition-all duration-200 translate-x-2 group-hover:translate-x-0 z-50 shadow-lg
                                    ">
                                        {item.label}
                                    </div>
                                )}
                            </motion.div>
                        </Link>
                    );
                })}
            </div>
        </motion.div>
    );
}
