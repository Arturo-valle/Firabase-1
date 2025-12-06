import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    HomeIcon,
    GlobeAltIcon,
    ChartBarIcon,
    MagnifyingGlassIcon,
    UserCircleIcon,
    Cog6ToothIcon,
    XMarkIcon,
    BookOpenIcon,
    SparklesIcon
} from '@heroicons/react/24/outline';

interface SidebarProps {
    mobileOpen: boolean;
    setMobileOpen: (open: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, setMobileOpen }) => {
    const location = useLocation();
    const currentPath = location.pathname;

    const navItems = [
        { id: 'home', label: 'Inicio', icon: HomeIcon, path: '/' },
        { id: 'discover', label: 'Descubrir', icon: GlobeAltIcon, path: '/discover' },
        { id: 'vault', label: 'Biblioteca', icon: BookOpenIcon, path: '/vault' },
        { id: 'finance', label: 'Finanzas', icon: ChartBarIcon, path: '/dashboard' },
        { id: 'standardizer', label: 'Métricas', icon: ChartBarIcon, path: '/standardizer' },
        { id: 'comparator', label: 'Comparador', icon: ChartBarIcon, path: '/comparator' },
        { id: 'ai', label: 'AI Assistant', icon: SparklesIcon, path: '/ai' },
    ];

    const isFinanceActive = ['/dashboard', '/vault', '/ai', '/standardizer', '/comparator'].includes(currentPath);

    return (
        <>
            {/* Mobile Overlay */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Sidebar Container */}
            <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-bg-secondary border-r border-border-subtle flex flex-col transform transition-transform duration-300 ease-in-out md:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                {/* Logo Area */}
                <div className="p-4 flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 flex items-center justify-center">
                            <SparklesIcon className="w-8 h-8 text-text-primary" />
                        </div>
                    </div>
                    {/* Close Button (Mobile Only) */}
                    <button
                        onClick={() => setMobileOpen(false)}
                        className="md:hidden p-1 text-text-secondary hover:text-text-primary"
                    >
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* New Thread Button */}
                <div className="px-3 mb-6">
                    <button className="w-full flex items-center justify-between bg-bg-primary hover:bg-bg-elevated text-text-secondary hover:text-text-primary border border-border-subtle rounded-full px-4 py-2.5 transition-all duration-200 group shadow-sm">
                        <span className="text-sm font-medium">New Thread</span>
                        <div className="text-text-tertiary group-hover:text-text-primary transition-colors">
                            <span className="text-xs border border-border-emphasis px-1.5 py-0.5 rounded text-text-tertiary">⌘ K</span>
                        </div>
                    </button>
                </div>

                {/* Search (Visual only for sidebar) */}
                <div className="px-3 mb-2">
                    <div className="flex items-center gap-3 px-3 py-2 text-text-tertiary hover:text-text-primary cursor-pointer rounded-lg transition-colors group">
                        <MagnifyingGlassIcon className="w-5 h-5 group-hover:text-text-primary transition-colors" />
                        <span className="text-sm font-medium">Search</span>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-2 space-y-1 overflow-y-auto">
                    {navItems.map((item) => {
                        const isActive = item.path === '/'
                            ? currentPath === '/'
                            : currentPath.startsWith(item.path) || (item.id === 'finance' && isFinanceActive);

                        return (
                            <Link
                                key={item.id}
                                to={item.path}
                                onClick={() => setMobileOpen(false)}
                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${isActive
                                    ? 'text-text-primary bg-bg-tertiary'
                                    : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
                                    }`}
                            >
                                <item.icon className={`w-5 h-5 ${isActive ? 'text-text-primary' : 'text-text-secondary group-hover:text-text-primary'}`} />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                {/* Bottom Actions */}
                <div className="p-3 border-t border-border-subtle space-y-1">
                    <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-text-secondary hover:bg-bg-tertiary hover:text-text-primary transition-colors">
                        <UserCircleIcon className="w-5 h-5" />
                        <span>Sign Up</span>
                    </button>
                    <button
                        onClick={() => {
                            document.documentElement.classList.toggle('dark');
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-text-secondary hover:bg-bg-tertiary hover:text-text-primary transition-colors"
                    >
                        <Cog6ToothIcon className="w-5 h-5" />
                        <span>Cambiar Tema</span>
                    </button>
                    <div className="px-3 py-2 mt-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-accent-primary/20 flex items-center justify-center text-accent-primary text-xs font-bold">
                                Pro
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs font-medium text-text-primary">Upgrade</span>
                                <span className="text-xs text-text-tertiary">Get Pro features</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Sidebar;
