import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    UserCircleIcon,
    ShieldCheckIcon,
    BellIcon,
    Cog6ToothIcon,
    ChartBarIcon,
    DocumentTextIcon,
    RocketLaunchIcon,
    ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';
import ProfileHeader from '../components/profile/ProfileHeader';
import ProfileStats from '../components/profile/ProfileStats';
import { useNavigate } from 'react-router-dom';

/**
 * Profile Page Component
 * Refactored to be modular and integrated with real authentication.
 */
export default function Profile() {
    const [activeTab, setActiveTab] = useState('overview');
    const { user: authUser, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/');
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    const user = {
        name: authUser?.displayName || 'Usuario Invitado',
        role: 'PRO TRADER',
        email: authUser?.email || 'N/A',
        joinDate: authUser?.metadata.creationTime
            ? new Date(authUser.metadata.creationTime).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
            : 'Enero 2024',
        avatar: authUser?.photoURL
    };

    const stats = [
        { label: 'Análisis Generados', value: '128', icon: DocumentTextIcon, color: 'text-blue-400' },
        { label: 'Emisores en Watchlist', value: '12', icon: ChartBarIcon, color: 'text-purple-400' },
        { label: 'Tiempo de Actividad', value: '45h', icon: RocketLaunchIcon, color: 'text-accent-primary' },
    ];

    const tabs = [
        { id: 'overview', label: 'Resumen', icon: UserCircleIcon },
        { id: 'security', label: 'Seguridad', icon: ShieldCheckIcon },
        { id: 'notifications', label: 'Notificaciones', icon: BellIcon },
        { id: 'settings', label: 'Preferencias', icon: Cog6ToothIcon },
    ];

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-700">
            {/* Header / Hero Section */}
            <ProfileHeader
                user={user}
                onLogout={handleLogout}
                onEdit={() => console.log('Edit Profile Clicked')}
            />

            {/* Stats Grid */}
            <ProfileStats stats={stats} />

            {/* Main Content Area: Tabs & Views */}
            <div className="bg-bg-elevated border border-border-subtle rounded-3xl overflow-hidden shadow-xl">
                <div className="flex border-b border-border-subtle bg-black/20 overflow-x-auto">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                                flex items-center gap-2 px-8 py-5 text-sm font-medium transition-all relative whitespace-nowrap
                                ${activeTab === tab.id ? 'text-accent-primary' : 'text-text-secondary hover:text-text-primary'}
                            `}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                            {activeTab === tab.id && (
                                <motion.div
                                    layoutId="activeTabProfile"
                                    className="absolute bottom-0 left-0 right-0 h-[2px] bg-accent-primary shadow-glow-cyan"
                                />
                            )}
                        </button>
                    ))}
                </div>

                <div className="p-8">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.2 }}
                        >
                            {activeTab === 'overview' && (
                                <div className="space-y-6">
                                    <h3 className="text-xl font-bold text-text-primary">Información Personal</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-4">
                                            <div className="group">
                                                <label className="block text-xs font-mono text-text-tertiary uppercase mb-2 tracking-widest">Nombre Completo</label>
                                                <div className="p-4 bg-bg-tertiary border border-border-subtle rounded-xl text-text-primary font-medium hover:bg-bg-elevated transition-colors cursor-default">
                                                    {user.name}
                                                </div>
                                            </div>
                                            <div className="group">
                                                <label className="block text-xs font-mono text-text-tertiary uppercase mb-2 tracking-widest">Correo Electrónico</label>
                                                <div className="p-4 bg-bg-tertiary border border-border-subtle rounded-xl text-text-primary font-medium hover:bg-bg-elevated transition-colors cursor-default">
                                                    {user.email}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="group">
                                                <label className="block text-xs font-mono text-text-tertiary uppercase mb-2 tracking-widest">Biografía / Perfil</label>
                                                <div className="p-4 bg-bg-tertiary border border-border-subtle rounded-xl text-text-secondary text-sm leading-relaxed min-h-[120px]">
                                                    Arquitecto de Software y Trader Profesional con enfoque en el mercado nicaragüense. Especialista en gestión de riesgos y análisis técnico avanzado de instrumentos financieros locales e internacionales.
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'security' && (
                                <div className="space-y-6">
                                    <h3 className="text-xl font-bold text-text-primary">Seguridad de la Cuenta</h3>
                                    <div className="space-y-4 max-w-2xl">
                                        <div className="flex items-center justify-between p-6 bg-bg-tertiary border border-border-subtle rounded-2xl">
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 bg-status-success/10 rounded-xl">
                                                    <ShieldCheckIcon className="w-6 h-6 text-status-success" />
                                                </div>
                                                <div>
                                                    <div className="text-text-primary font-bold">Autenticación de Dos Factores</div>
                                                    <div className="text-text-tertiary text-sm">Protege tu cuenta con un nivel extra de seguridad.</div>
                                                </div>
                                            </div>
                                            <button className="px-4 py-2 bg-accent-primary text-black font-bold text-xs rounded-lg uppercase tracking-widest shadow-glow-cyan">
                                                Activado
                                            </button>
                                        </div>

                                        <div className="flex items-center justify-between p-6 bg-bg-tertiary border border-border-subtle rounded-2xl">
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 bg-blue-600/10 rounded-xl text-blue-400">
                                                    <DocumentTextIcon className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <div className="text-text-primary font-bold">Registro de Actividad</div>
                                                    <div className="text-text-tertiary text-sm">Lista de tus últimos inicios de sesión y operaciones.</div>
                                                </div>
                                            </div>
                                            <button className="text-text-secondary hover:text-text-primary transition-colors">
                                                <ArrowRightOnRectangleIcon className="w-5 h-5 rotate-180" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab !== 'overview' && activeTab !== 'security' && (
                                <div className="h-48 flex items-center justify-center text-text-tertiary italic">
                                    Sección de {activeTab} en construcción...
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
