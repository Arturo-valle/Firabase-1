import { useState } from 'react';
import { MagnifyingGlassIcon, BellIcon, UserCircleIcon } from '@heroicons/react/24/outline';

export default function TopBar() {
    const [searchQuery, setSearchQuery] = useState('');
    const [notifications] = useState(3); // Número de notificaciones no leídas

    return (
        <div className="fixed top-0 left-16 right-0 h-16 bg-bg-secondary/80 backdrop-blur-xl border-b border-border-subtle z-40">
            <div className="flex items-center justify-between h-full px-6">
                {/* Left: Logo/Title */}
                <div className="flex items-center gap-4">
                    <h1 className="text-lg font-bold text-text-primary">
                        CentraCapital <span className="text-accent-primary">Intelligence</span>
                    </h1>
                    <span className="text-text-tertiary text-sm">
                        Mercado de Valores de Nicaragua
                    </span>
                </div>

                {/* Center: Search Bar */}
                <div className="flex-1 max-w-2xl mx-6">
                    <div className="relative">
                        <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Buscar emisores, documentos, o analizar..."
                            className="
                w-full pl-12 pr-4 py-2.5 bg-bg-tertiary border border-border-default rounded-xl
                text-text-primary placeholder:text-text-tertiary
                focus:outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20
                transition-all duration-200
              "
                        />
                        {searchQuery && (
                            <kbd className="absolute right-4 top-1/2 -translate-y-1/2 px-2 py-1 bg-bg-elevated rounded text-xs text-text-tertiary border border-border-subtle">
                                Enter
                            </kbd>
                        )}
                    </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-3">
                    {/* Notifications */}
                    <button className="relative p-2 hover:bg-bg-tertiary rounded-lg transition-colors">
                        <BellIcon className="w-5 h-5 text-text-secondary" />
                        {notifications > 0 && (
                            <span className="
                absolute top-1 right-1 w-4 h-4 bg-status-danger rounded-full
                text-white text-xs flex items-center justify-center font-bold
              ">
                                {notifications}
                            </span>
                        )}
                    </button>

                    {/* User Profile */}
                    <button className="flex items-center gap-2 px-3 py-1.5 hover:bg-bg-tertiary rounded-lg transition-colors">
                        <UserCircleIcon className="w-6 h-6 text-text-secondary" />
                        <span className="text-text-primary text-sm font-medium">Admin</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
