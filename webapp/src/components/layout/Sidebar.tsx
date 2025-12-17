import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
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
        <div
            className={`
        fixed left-3 top-3 bottom-3 
        bg-black/60 backdrop-blur-xl border border-white/10
        transition-all duration-300 ease-out z-50 rounded-2xl shadow-elevated
        flex flex-col justify-between py-6
        ${isExpanded ? 'w-64' : 'w-20'}
      `}
            onMouseEnter={() => setIsExpanded(true)}
            onMouseLeave={() => setIsExpanded(false)}
        >
            {/* Logo */}
            <div className={`flex items-center px-5 mb-8 ${isExpanded ? 'justify-start' : 'justify-center'}`}>
                <div className="w-10 h-10 bg-gradient-to-br from-accent-primary to-blue-600 rounded-xl flex items-center justify-center shadow-glow-cyan flex-shrink-0">
                    <span className="text-black font-bold text-xl font-mono">C</span>
                </div>
                {isExpanded && (
                    <span className="ml-3 text-white font-bold text-xl tracking-tight animate-fade-in whitespace-nowrap">
                        Centra<span className="text-accent-primary">Capital</span>
                    </span>
                )}
            </div>

            {/* Navigation Items */}
            <nav className="flex-1 px-3 space-y-2 overflow-y-auto custom-scrollbar">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.route);

                    return (
                        <Link
                            key={item.id}
                            to={item.route}
                            className={`
                  flex items-center px-3 py-3 rounded-xl
                  transition-all duration-200 group relative
                  ${active
                                    ? 'bg-accent-primary text-black font-bold shadow-glow-cyan'
                                    : 'text-text-secondary hover:bg-white/10 hover:text-white'
                                }
                  ${!isExpanded && 'justify-center'}
                `}
                        >
                            <Icon className={`w-6 h-6 flex-shrink-0 ${active ? 'animate-pulse-slow' : ''}`} />

                            {isExpanded && (
                                <>
                                    <span className="ml-3 text-sm">{item.label}</span>
                                    {item.badge && (
                                        <span className="ml-auto text-[10px] bg-accent-secondary/20 text-accent-secondary px-2 py-0.5 rounded-full border border-accent-secondary/30">
                                            {item.badge}
                                        </span>
                                    )}
                                </>
                            )}

                            {/* Tooltip for collapsed state */}
                            {!isExpanded && (
                                <div className="
                    absolute left-full ml-4 px-3 py-2 bg-bg-elevated/90 backdrop-blur border border-white/10 rounded-lg
                    text-white text-xs font-medium whitespace-nowrap
                    opacity-0 group-hover:opacity-100 pointer-events-none
                    transition-all duration-200 translate-x-2 group-hover:translate-x-0 z-50
                  ">
                                    {item.label}
                                </div>
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Bottom Navigation */}
            <div className="px-3 pt-4 mt-4 border-t border-white/5 space-y-2">
                {bottomNavItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.route);

                    return (
                        <Link
                            key={item.id}
                            to={item.route}
                            className={`
                  flex items-center px-3 py-3 rounded-xl
                  transition-all duration-200 group relative
                  ${active
                                    ? 'bg-accent-primary text-black font-bold'
                                    : 'text-text-secondary hover:bg-white/10 hover:text-white'
                                }
                  ${!isExpanded && 'justify-center'}
                `}
                        >
                            <Icon className="w-6 h-6 flex-shrink-0" />

                            {isExpanded && (
                                <span className="ml-3 text-sm">{item.label}</span>
                            )}

                            {/* Tooltip for collapsed state */}
                            {!isExpanded && (
                                <div className="
                    absolute left-full ml-4 px-3 py-2 bg-bg-elevated/90 backdrop-blur border border-white/10 rounded-lg
                    text-white text-xs font-medium whitespace-nowrap
                    opacity-0 group-hover:opacity-100 pointer-events-none
                    transition-all duration-200 translate-x-2 group-hover:translate-x-0 z-50
                  ">
                                    {item.label}
                                </div>
                            )}
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
