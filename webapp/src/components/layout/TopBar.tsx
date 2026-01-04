import { useState } from 'react';
import { MagnifyingGlassIcon, BellIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';

export default function TopBar() {
    const [searchQuery, setSearchQuery] = useState('');
    const [notifications] = useState(3);

    return (
        <div className="fixed top-0 left-20 right-0 h-16 bg-black/50 backdrop-blur-md border-b border-white/5 z-40 transition-all duration-300">
            <div className="flex items-center justify-between h-full px-6">
                {/* Left: Title / Breadcrumbs */}
                <div className="flex items-center gap-4 opacity-0 md:opacity-100 transition-opacity">
                    <div className="h-6 w-[1px] bg-white/10 mx-2"></div>
                    <h1 className="text-sm font-mono text-text-secondary tracking-widest uppercase">
                        Terminal <span className="text-accent-primary">V.2.0</span>
                    </h1>
                </div>

                {/* Center: Command Bar */}
                <div className="flex-1 max-w-xl mx-6">
                    <div className="relative group">
                        <div className="absolute inset-0 bg-accent-primary/20 blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity rounded-full ml-10 mr-10"></div>
                        <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary group-focus-within:text-accent-primary transition-colors" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Buscar ticker, comando o análisis..."
                            className="
                                w-full pl-10 pr-12 py-2 bg-white/5 border border-white/10 rounded-full
                                text-text-primary placeholder:text-text-tertiary text-sm font-mono
                                focus:outline-none focus:border-accent-primary/50 focus:bg-white/10
                                transition-all duration-200
                            "
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
                            <kbd className="hidden sm:inline-block px-1.5 py-0.5 bg-black/50 rounded border border-white/10 text-[10px] text-text-tertiary font-mono">
                                ⌘K
                            </kbd>
                        </div>
                    </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-4">
                    {/* Status Indicator */}
                    <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/5">
                        <div className="w-1.5 h-1.5 rounded-full bg-status-success shadow-glow-green animate-pulse"></div>
                        <span className="text-[10px] font-mono text-status-success">ONLINE</span>
                    </div>

                    <div className="h-6 w-[1px] bg-white/10"></div>

                    {/* Notifications */}
                    <button className="relative p-2 hover:bg-white/5 rounded-lg transition-colors group">
                        <BellIcon className="w-5 h-5 text-text-secondary group-hover:text-text-primary transition-colors" />
                        {notifications > 0 && (
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent-secondary rounded-full shadow-glow-red"></span>
                        )}
                    </button>

                    {/* User Profile */}
                    <Link to="/profile" className="flex items-center gap-3 pl-2 pr-1 py-1 hover:bg-white/5 rounded-full transition-colors border border-transparent hover:border-white/5">
                        <div className="text-right hidden sm:block">
                            <div className="text-xs font-bold text-text-primary">Admin User</div>
                            <div className="text-[10px] text-accent-primary font-mono">PRO TRADER</div>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-accent-primary to-blue-600 p-[1px]">
                            <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
                                <UserCircleIcon className="w-5 h-5 text-gray-300" />
                            </div>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    );
}
