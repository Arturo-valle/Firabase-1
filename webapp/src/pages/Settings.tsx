import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    UserCircleIcon,
    PaintBrushIcon,
    ShieldCheckIcon,
    BellIcon,
    SunIcon,
    MoonIcon,
    FingerPrintIcon,
    ChevronRightIcon
} from '@heroicons/react/24/outline';
import { useTheme } from '../context/ThemeContext';

const tabs = [
    { id: 'general', name: 'General', icon: UserCircleIcon, desc: 'Perfil y datos básicos' },
    { id: 'appearance', name: 'Apariencia', icon: PaintBrushIcon, desc: 'Tema y personalización' },
    { id: 'security', name: 'Seguridad', icon: ShieldCheckIcon, desc: '2FA y sesiones' },
    { id: 'notifications', name: 'Notificaciones', icon: BellIcon, desc: 'Alertas y avisos' },
];

export default function Settings() {
    const [activeTab, setActiveTab] = useState('general');
    const { theme, setTheme } = useTheme();

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

            {/* Page Header */}
            <div className="mb-12">
                <h1 className="text-4xl font-bold text-text-primary tracking-tight mb-2">Configuración</h1>
                <p className="text-text-secondary text-lg">Gestiona tus preferencias personales y de seguridad.</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-12">

                {/* Navigation Sidebar (Floating Pill Style) */}
                <aside className="lg:w-72 flex flex-col gap-2">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const active = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`
                                  relative group flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-300
                                  ${active ? 'bg-bg-secondary shadow-lg' : 'hover:bg-bg-tertiary'}
                                `}
                            >
                                {/* Active Indicator */}
                                {active && (
                                    <motion.div
                                        layoutId="activeTab"
                                        className="absolute left-0 w-1 h-8 bg-accent-primary rounded-r-full"
                                    />
                                )}

                                <div className={`p-2 rounded-xl transition-colors ${active ? 'bg-accent-primary/10 text-accent-primary' : 'bg-bg-tertiary text-text-tertiary group-hover:text-text-primary'}`}>
                                    <Icon className="w-6 h-6" />
                                </div>
                                <div className="text-left">
                                    <p className={`font-semibold ${active ? 'text-text-primary' : 'text-text-secondary group-hover:text-text-primary'}`}>
                                        {tab.name}
                                    </p>
                                    <p className="text-xs text-text-tertiary">{tab.desc}</p>
                                </div>

                                {active && <ChevronRightIcon className="w-5 h-5 ml-auto text-accent-primary" />}
                            </button>
                        );
                    })}
                </aside>

                {/* Content Area (Glass Island) */}
                <main className="flex-1 min-h-[600px]">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-8"
                        >
                            {activeTab === 'general' && (
                                <div className="glass-panel p-8 space-y-8">
                                    <section className="space-y-6">
                                        <div className="flex items-center gap-4 mb-8">
                                            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-accent-primary to-purple-500 flex items-center justify-center text-3xl font-bold text-white shadow-xl">
                                                UD
                                            </div>
                                            <div>
                                                <h2 className="text-2xl font-bold text-text-primary">Usuario Demo</h2>
                                                <p className="text-text-secondary">demo@centracapital.com</p>
                                            </div>
                                            <button className="btn-secondary ml-auto">Editar Perfil</button>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-sm text-text-secondary font-medium uppercase tracking-wider">Nombre Completo</label>
                                                <div className="w-full bg-bg-tertiary border border-border-subtle rounded-xl px-4 py-3 text-text-primary">
                                                    Usuario Demo
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm text-text-secondary font-medium uppercase tracking-wider">Cargo</label>
                                                <div className="w-full bg-bg-tertiary border border-border-subtle rounded-xl px-4 py-3 text-text-primary">
                                                    Analista Senior
                                                </div>
                                            </div>
                                        </div>
                                    </section>
                                </div>
                            )}

                            {activeTab === 'appearance' && (
                                <div className="space-y-8">
                                    <div className="glass-panel p-8">
                                        <h2 className="text-xl font-bold text-text-primary mb-6 flex items-center gap-2">
                                            <PaintBrushIcon className="w-6 h-6 text-accent-primary" />
                                            Tema de la Interfaz
                                        </h2>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* Dark Mode Card */}
                                            <div
                                                onClick={() => setTheme('dark')}
                                                className={`
                                                    relative overflow-hidden cursor-pointer rounded-2xl border-2 transition-all duration-300 group
                                                    ${theme === 'dark'
                                                        ? 'border-accent-primary bg-gray-900 shadow-2xl scale-[1.02]'
                                                        : 'border-border-subtle bg-bg-tertiary hover:border-gray-600'}
                                                `}
                                            >
                                                <div className="p-6 relative z-10">
                                                    <div className="flex justify-between items-start mb-12">
                                                        <div className={`p-3 rounded-xl ${theme === 'dark' ? 'bg-accent-primary/20 text-accent-primary' : 'bg-gray-800 text-gray-400'}`}>
                                                            <MoonIcon className="w-8 h-8" />
                                                        </div>
                                                        {theme === 'dark' && (
                                                            <span className="bg-accent-primary text-black text-xs font-bold px-3 py-1 rounded-full">ACTIVO</span>
                                                        )}
                                                    </div>
                                                    <h3 className="text-xl font-bold text-white mb-2">Midnight Glass</h3>
                                                    <p className="text-gray-400 text-sm">Diseño profundo con alto contraste, ideal para entornos de baja luz.</p>
                                                </div>
                                                {/* Visual Preview Abstract */}
                                                <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-accent-primary/20 to-transparent opacity-50 rounded-tl-full"></div>
                                            </div>

                                            {/* Light Mode Card */}
                                            <div
                                                onClick={() => setTheme('light')}
                                                className={`
                                                    relative overflow-hidden cursor-pointer rounded-2xl border-2 transition-all duration-300 group
                                                    ${theme === 'light'
                                                        ? 'border-accent-primary bg-white shadow-2xl scale-[1.02]'
                                                        : 'border-border-subtle bg-bg-tertiary hover:border-gray-400'}
                                                `}
                                            >
                                                <div className="p-6 relative z-10">
                                                    <div className="flex justify-between items-start mb-12">
                                                        <div className={`p-3 rounded-xl ${theme === 'light' ? 'bg-accent-primary/20 text-accent-primary' : 'bg-white text-gray-400 shadow-sm'}`}>
                                                            <SunIcon className="w-8 h-8" />
                                                        </div>
                                                        {theme === 'light' && (
                                                            <span className="bg-accent-primary text-white text-xs font-bold px-3 py-1 rounded-full">ACTIVO</span>
                                                        )}
                                                    </div>
                                                    <h3 className="text-xl font-bold text-slate-900 mb-2">Platinum Light</h3>
                                                    <p className="text-slate-500 text-sm">Estética limpia estilo suizo, sombras difusas y máxima legibilidad.</p>
                                                </div>
                                                <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-accent-primary/10 to-transparent opacity-50 rounded-tl-full"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'security' && (
                                <div className="glass-panel p-8 space-y-8">
                                    <h2 className="text-xl font-bold text-text-primary mb-6 flex items-center gap-2">
                                        <ShieldCheckIcon className="w-6 h-6 text-status-warning" />
                                        Seguridad
                                    </h2>

                                    <div className="card-premium flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-accent-primary/10 rounded-xl text-accent-primary">
                                                <FingerPrintIcon className="w-8 h-8" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-text-primary text-lg">2FA (Autenticación de Dos Factores)</p>
                                                <p className="text-text-secondary">Protege tu cuenta con una capa extra de seguridad.</p>
                                            </div>
                                        </div>
                                        <button className="btn-primary">Activar</button>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </main>
            </div>
        </div>
    );
}
