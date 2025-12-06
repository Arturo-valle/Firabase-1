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
        fixed left-0 top-0 h-screen bg-bg-secondary border-r border-border-subtle
        transition-all duration-300 ease-in-out z-50
        ${isExpanded ? 'w-60' : 'w-16'}
      `}
            onMouseEnter={() => setIsExpanded(true)}
            onMouseLeave={() => setIsExpanded(false)}
        >
            {/* Logo */}
            <div className="flex items-center h-16 px-4 border-b border-border-subtle">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 bg-gradient-to-br from-accent-primary to-accent-secondary rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold text-lg">C</span>
                    </div>
                    {isExpanded && (
                        <span className="text-text-primary font-bold text-lg whitespace-nowrap">
                            CentraCapital
                        </span>
                    )}
                </div>
            </div>

            {/* Navigation Items */}
            <nav className="flex flex-col h-[calc(100vh-8rem)] justify-between py-4">
                <div className="space-y-1 px-2">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.route);

                        return (
                            <Link
                                key={item.id}
                                to={item.route}
                                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg
                  transition-all duration-200 group relative
                  ${active
                                        ? 'bg-accent-primary/10 text-accent-primary'
                                        : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
                                    }
                `}
                            >
                                {/* Active indicator */}
                                {active && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-accent-primary rounded-r-full" />
                                )}

                                <Icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-accent-primary' : ''}`} />

                                {isExpanded && (
                                    <>
                                        <span className="font-medium whitespace-nowrap">{item.label}</span>
                                        {item.badge && (
                                            <span className="ml-auto badge-success">{item.badge}</span>
                                        )}
                                    </>
                                )}

                                {/* Tooltip for collapsed state */}
                                {!isExpanded && (
                                    <div className="
                    absolute left-full ml-2 px-3 py-1.5 bg-bg-elevated rounded-lg
                    text-text-primary text-sm font-medium whitespace-nowrap
                    opacity-0 group-hover:opacity-100 pointer-events-none
                    transition-opacity duration-200 shadow-elevated
                  ">
                                        {item.label}
                                    </div>
                                )}
                            </Link>
                        );
                    })}
                </div>

                {/* Bottom Navigation */}
                <div className="space-y-1 px-2 border-t border-border-subtle pt-4">
                    {bottomNavItems.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.route);

                        return (
                            <Link
                                key={item.id}
                                to={item.route}
                                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg
                  transition-all duration-200 group relative
                  ${active
                                        ? 'bg-accent-primary/10 text-accent-primary'
                                        : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
                                    }
                `}
                            >
                                <Icon className="w-5 h-5 flex-shrink-0" />

                                {isExpanded && (
                                    <span className="font-medium whitespace-nowrap">{item.label}</span>
                                )}

                                {!isExpanded && (
                                    <div className="
                    absolute left-full ml-2 px-3 py-1.5 bg-bg-elevated rounded-lg
                    text-text-primary text-sm font-medium whitespace-nowrap
                    opacity-0 group-hover:opacity-100 pointer-events-none
                    transition-opacity duration-200 shadow-elevated
                  ">
                                        {item.label}
                                    </div>
                                )}
                            </Link>
                        );
                    })}
                </div>
            </nav>
        </div>
    );
}
