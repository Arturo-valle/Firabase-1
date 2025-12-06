import { motion } from 'framer-motion';

interface NewsItem {
    title: string;
    category: string;
    timestamp: string;
}

interface NewsTickerProps {
    news: NewsItem[];
}

export default function NewsTicker({ news }: NewsTickerProps) {
    if (news.length === 0) return null;

    return (
        <div className="w-full bg-bg-elevated border-y border-white/5 overflow-hidden h-10 flex items-center relative z-20">
            <div className="absolute left-0 h-full w-20 bg-gradient-to-r from-bg-primary to-transparent z-10" />
            <div className="absolute right-0 h-full w-20 bg-gradient-to-l from-bg-primary to-transparent z-10" />

            <div className="flex items-center px-4 gap-2 z-20 bg-bg-primary h-full border-r border-white/10">
                <span className="w-2 h-2 rounded-full bg-accent-primary animate-pulse" />
                <span className="text-xs font-bold text-accent-primary tracking-wider uppercase">Verte AI News</span>
            </div>

            <div className="flex-1 overflow-hidden flex items-center">
                <motion.div
                    className="flex items-center gap-12 whitespace-nowrap"
                    animate={{ x: [0, -1000] }}
                    transition={{
                        repeat: Infinity,
                        duration: 30,
                        ease: "linear"
                    }}
                >
                    {[...news, ...news, ...news].map((item, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                            <span className="text-xs font-medium text-gray-400">
                                {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="text-sm font-medium text-gray-200">
                                {item.title}
                            </span>
                            <span className={`
                                text-[10px] px-1.5 py-0.5 rounded 
                                ${item.category === 'market' ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'}
                            `}>
                                {item.category.toUpperCase()}
                            </span>
                        </div>
                    ))}
                </motion.div>
            </div>
        </div>
    );
}
