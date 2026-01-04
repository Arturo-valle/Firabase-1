import { UserCircleIcon, Cog6ToothIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';

interface ProfileHeaderProps {
    user: {
        name: string;
        role: string;
        email: string;
        joinDate: string;
    };
    onLogout: () => void;
    onEdit: () => void;
}

export default function ProfileHeader({ user, onLogout, onEdit }: ProfileHeaderProps) {
    return (
        <section className="relative overflow-hidden rounded-3xl bg-bg-elevated border border-border-subtle p-8 shadow-2xl">
            {/* Background Decorative Gradients */}
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-accent-primary/10 blur-[100px] rounded-full"></div>
            <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-blue-600/10 blur-[100px] rounded-full"></div>

            <div className="relative flex flex-col md:flex-row items-center gap-8">
                {/* Avatar Container */}
                <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-tr from-accent-primary to-blue-600 rounded-full blur-md opacity-50 group-hover:opacity-100 transition-opacity"></div>
                    <div className="w-32 h-32 rounded-full bg-black p-[2px] relative z-10 overflow-hidden shadow-glow-cyan">
                        <div className="w-full h-full rounded-full bg-bg-primary flex items-center justify-center">
                            <UserCircleIcon className="w-20 h-20 text-text-tertiary" />
                        </div>
                    </div>
                    <button className="absolute bottom-1 right-1 bg-accent-primary text-black p-2 rounded-full shadow-lg hover:scale-110 transition-transform">
                        <Cog6ToothIcon className="w-4 h-4" />
                    </button>
                </div>

                {/* User Info */}
                <div className="text-center md:text-left space-y-2">
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                        <h1 className="text-4xl font-bold text-text-primary tracking-tight">{user.name}</h1>
                        <span className="px-3 py-1 bg-accent-primary/20 text-accent-primary text-[10px] font-mono font-bold rounded-full border border-accent-primary/30 uppercase tracking-widest">
                            {user.role}
                        </span>
                    </div>
                    <p className="text-text-secondary font-mono text-sm">{user.email}</p>
                    <p className="text-text-tertiary text-xs mt-2 uppercase tracking-widest font-medium">
                        Miembro desde {user.joinDate}
                    </p>
                </div>

                <div className="md:ml-auto flex gap-4">
                    <button
                        onClick={onEdit}
                        className="flex items-center gap-2 px-6 py-2.5 bg-bg-tertiary hover:bg-bg-elevated text-text-primary rounded-xl border border-border-subtle transition-all font-medium text-sm"
                    >
                        Editar Perfil
                    </button>
                    <button
                        onClick={onLogout}
                        className="flex items-center gap-2 px-6 py-2.5 bg-status-error/10 hover:bg-status-error/20 text-status-error rounded-xl border border-status-error/20 transition-all font-medium text-sm"
                    >
                        <ArrowRightOnRectangleIcon className="w-4 h-4" />
                        Cerrar Sesión
                    </button>
                </div>
            </div>
        </section>
    );
}
