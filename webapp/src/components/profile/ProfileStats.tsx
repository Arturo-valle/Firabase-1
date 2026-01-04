import { motion } from 'framer-motion';

interface Stat {
    label: string;
    value: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
}

interface ProfileStatsProps {
    stats: Stat[];
}

export default function ProfileStats({ stats }: ProfileStatsProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {stats.map((stat, idx) => (
                <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="bg-bg-elevated border border-border-subtle p-6 rounded-2xl hover:border-border-subtle transition-all group"
                >
                    <div className={`p-3 rounded-xl bg-bg-tertiary w-fit group-hover:bg-bg-elevated transition-colors mb-4 ${stat.color}`}>
                        <stat.icon className="w-6 h-6" />
                    </div>
                    <div className="text-3xl font-bold text-text-primary mb-1">{stat.value}</div>
                    <div className="text-text-tertiary text-sm font-medium uppercase tracking-wider">{stat.label}</div>
                </motion.div>
            ))}
        </div>
    );
}
