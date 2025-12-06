import { BookOpenIcon } from '@heroicons/react/24/outline';

interface Citation {
    text: string;
    source: string;
    relevance?: string;
}

interface CitationProps {
    citations: Citation[];
}

export default function Citations({ citations }: CitationProps) {
    if (!citations || citations.length === 0) return null;

    return (
        <div className="mt-4 pt-4 border-t border-white/10">
            <h5 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                <BookOpenIcon className="w-3 h-3" />
                Fuentes Citadas
            </h5>
            <div className="flex flex-wrap gap-2">
                {citations.map((citation, idx) => (
                    <div
                        key={idx}
                        className="group relative bg-white/5 hover:bg-white/10 border border-white/10 rounded px-2 py-1 transition-colors cursor-help"
                        title={citation.text}
                    >
                        <span className="text-xs text-accent-primary font-mono mr-1">[{idx + 1}]</span>
                        <span className="text-xs text-gray-300 truncate max-w-[150px] inline-block align-bottom">
                            {citation.source}
                        </span>

                        {/* Tooltip */}
                        <div className="absolute bottom-full left-0 mb-2 w-64 p-2 bg-gray-900 border border-white/20 rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                            <p className="text-xs text-gray-300 italic">"{citation.text}"</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
