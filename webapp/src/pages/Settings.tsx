import { useState } from 'react';
import {
    UserCircleIcon,
    PaintBrushIcon,
    ShieldCheckIcon,
    BellIcon,
    LanguageIcon,
    SunIcon,
    MoonIcon,
    DevicePhoneMobileIcon,
    FingerPrintIcon
} from '@heroicons/react/24/outline';

const tabs = [
    { id: 'general', name: 'General', icon: UserCircleIcon },
    { id: 'appearance', name: 'Apariencia', icon: PaintBrushIcon },
    { id: 'security', name: 'Seguridad', icon: ShieldCheckIcon },
    { id: 'notifications', name: 'Notificaciones', icon: BellIcon },
];

import { useTheme } from '../context/ThemeContext';

export default function Settings() {
    const [activeTab, setActiveTab] = useState('general');
    const { theme, setTheme } = useTheme();

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col gap-2">
                <h1 className="text-4xl font-bold text-gradient-cyan">Configuración</h1>
                <p className="text-text-secondary">Gestiona tus preferencias personales y de seguridad.</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Navigation Sidebar */}
                <aside className="lg:w-64 flex flex-col gap-1">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const active = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                  ${active
                                        ? 'bg-accent-primary text-black font-bold shadow-glow-cyan'
                                        : 'text-text-secondary hover:bg-white/5 hover:text-white'}
                `}
                            >
                                <Icon className="w-5 h-5" />
                                <span>{tab.name}</span>
                            </button>
                        );
                    })}
                </aside>

                {/* Content Area */}
                <main className="flex-1 glass-panel p-8 min-h-[500px]">
                    {activeTab === 'general' && (
                        <div className="space-y-8 animate-fade-in">
                            <section className="space-y-6">
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <UserCircleIcon className="w-6 h-6 text-accent-primary" />
                                    Perfil de Usuario
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm text-text-secondary font-medium uppercase tracking-wider">Nombre Completo</label>
                                        <input
                                            type="text"
                                            readOnly
                                            value="Usuario Demo"
                                            className="w-full bg-bg-tertiary border border-border-subtle rounded-lg px-4 py-2 text-text-primary focus:border-accent-primary outline-none transition-colors"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm text-text-secondary font-medium uppercase tracking-wider">Correo Electrónico</label>
                                        <input
                                            type="email"
                                            readOnly
                                            value="demo@centracapital.com"
                                            className="w-full bg-bg-tertiary border border-border-subtle rounded-lg px-4 py-2 text-text-primary focus:border-accent-primary outline-none transition-colors"
                                        />
                                    </div>
                                </div>
                            </section>

                            <hr className="border-white/5" />

                            <section className="space-y-6">
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <LanguageIcon className="w-6 h-6 text-accent-primary" />
                                    Idioma y Región
                                </h2>
                                <div className="space-y-2">
                                    <label className="text-sm text-text-secondary font-medium uppercase tracking-wider">Idioma de la Interfaz</label>
                                    <select className="w-full bg-bg-tertiary border border-border-subtle rounded-lg px-4 py-2 text-text-primary focus:border-accent-primary outline-none transition-colors appearance-none">
                                        <option>Español (ES)</option>
                                        <option>English (US)</option>
                                        <option>Português (BR)</option>
                                    </select>
                                </div>
                            </section>
                        </div>
                    )}

                    {activeTab === 'appearance' && (
                        <div className="space-y-8 animate-fade-in">
                            <section className="space-y-6">
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <PaintBrushIcon className="w-6 h-6 text-accent-primary" />
                                    Personalización Visual
                                </h2>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div
                                        onClick={() => setTheme('dark')}
                                        className={`card space-y-4 group cursor-pointer transition-all ${theme === 'dark' ? 'border-accent-primary shadow-glow-cyan ring-1 ring-accent-primary' : 'hover:border-white/30 opacity-70 hover:opacity-100'}`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <MoonIcon className={`w-6 h-6 ${theme === 'dark' ? 'text-accent-primary' : 'text-text-secondary'}`} />
                                                <div>
                                                    <p className="font-bold">Modo Oscuro</p>
                                                    <p className="text-xs text-text-secondary">Elegante y cómodo para la vista</p>
                                                </div>
                                            </div>
                                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${theme === 'dark' ? 'border-accent-primary' : 'border-text-secondary'}`}>
                                                {theme === 'dark' && <div className="w-3 h-3 bg-accent-primary rounded-full"></div>}
                                            </div>
                                        </div>
                                    </div>

                                    <div
                                        onClick={() => setTheme('light')}
                                        className={`card space-y-4 group cursor-pointer transition-all ${theme === 'light' ? 'border-accent-primary shadow-glow-cyan ring-1 ring-accent-primary' : 'hover:border-white/30 opacity-70 hover:opacity-100'}`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <SunIcon className={`w-6 h-6 ${theme === 'light' ? 'text-accent-primary' : 'text-text-secondary'}`} />
                                                <div>
                                                    <p className="font-bold">Modo Claro</p>
                                                    <p className="text-xs text-text-secondary">Alta visibilidad en exteriores</p>
                                                </div>
                                            </div>
                                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${theme === 'light' ? 'border-accent-primary' : 'border-text-secondary'}`}>
                                                {theme === 'light' && <div className="w-3 h-3 bg-accent-primary rounded-full"></div>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <hr className="border-white/5" />

                            <section className="space-y-4 text-center py-8">
                                <p className="text-text-secondary italic">Más opciones de personalización próximamente...</p>
                            </section>
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <div className="space-y-8 animate-fade-in">
                            <section className="space-y-6">
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <ShieldCheckIcon className="w-6 h-6 text-status-warning" />
                                    Seguridad de la Cuenta
                                </h2>

                                <div className="space-y-4">
                                    <div className="card flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-white/5 rounded-xl">
                                                <FingerPrintIcon className="w-6 h-6 text-accent-primary" />
                                            </div>
                                            <div>
                                                <p className="font-bold">Autenticación de Dos Factores (2FA)</p>
                                                <p className="text-sm text-text-secondary">Añade una capa extra de seguridad a tu cuenta.</p>
                                            </div>
                                        </div>
                                        <button className="btn-secondary">Configurar</button>
                                    </div>

                                    <hr className="border-white/5" />

                                    <div className="card flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-white/5 rounded-xl">
                                                <DevicePhoneMobileIcon className="w-6 h-6 text-accent-primary" />
                                            </div>
                                            <div>
                                                <p className="font-bold">Sesiones Activas</p>
                                                <p className="text-sm text-text-secondary">Gestiona los dispositivos donde has iniciado sesión.</p>
                                            </div>
                                        </div>
                                        <button className="btn-secondary">Ver Todo</button>
                                    </div>
                                </div>
                            </section>

                            <div className="p-6 bg-status-danger/10 border border-status-danger/20 rounded-xl space-y-4">
                                <h3 className="text-status-danger font-bold">Zona de Peligro</h3>
                                <p className="text-sm text-text-secondary">Al eliminar tu cuenta, todos tus datos y análisis guardados se borrarán permanentemente.</p>
                                <button className="px-4 py-2 bg-status-danger text-white font-bold rounded-lg hover:bg-red-600 transition-colors">Eliminar Cuenta</button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'notifications' && (
                        <div className="space-y-8 animate-fade-in">
                            <section className="space-y-6">
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <BellIcon className="w-6 h-6 text-accent-primary" />
                                    Notificaciones y Alertas
                                </h2>

                                <div className="space-y-6">
                                    {[
                                        { title: 'Alertas de Mercado', desc: 'Recibe avisos cuando una emisora cambie > 5%' },
                                        { title: 'Reportes Semanales', desc: 'Resumen ejecutivo de tu portafolio y favoritos' },
                                        { title: 'Noticias Relevantes', desc: 'Eventos macroeconómicos que afectan tus activos' }
                                    ].map((item, idx) => (
                                        <div key={idx} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                                            <div>
                                                <p className="font-bold">{item.title}</p>
                                                <p className="text-sm text-text-secondary">{item.desc}</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" className="sr-only peer" defaultChecked={idx === 0} />
                                                <div className="w-11 h-6 bg-bg-tertiary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-text-muted after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-primary peer-checked:after:bg-black"></div>
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
