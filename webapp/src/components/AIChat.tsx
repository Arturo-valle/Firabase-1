import React, { useState, useRef, useEffect } from 'react';
import { PaperAirplaneIcon, SparklesIcon, TrashIcon } from '@heroicons/react/24/solid';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    sources?: { title: string; url: string }[];
}

export const AIChat: React.FC = () => {
    const [query, setQuery] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        const userMsg: Message = { role: 'user', content: query };
        setMessages(prev => [...prev, userMsg]);
        setQuery('');
        setLoading(true);

        try {
            const apiUrl = 'https://us-central1-mvp-nic-market.cloudfunctions.net/api/ai/query'; // Ensure this matches environment or direct URL
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: userMsg.content, analysisType: 'general' })
            });

            const data = await response.json();

            if (response.ok) {
                const assistantMsg: Message = {
                    role: 'assistant',
                    content: data.answer || "No pude encontrar una respuesta específica en los documentos.",
                    sources: data.sources
                };
                setMessages(prev => [...prev, assistantMsg]);
            } else {
                throw new Error(data.error || 'Error en la conexión con el servidor.');
            }

        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, { role: 'assistant', content: "⚠️ ERROR: Fallo en el enlace de comunicación. Intente nuevamente." }]);
        } finally {
            setLoading(false);
        }
    };

    const clearChat = () => {
        setMessages([]);
    };

    return (
        <div className="flex flex-col h-[600px] glass-panel rounded-xl overflow-hidden border border-white/5 shadow-2xl relative">
            {/* Ambient Background */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent-primary/5 blur-[80px] rounded-full pointer-events-none"></div>

            {/* Header */}
            <div className="p-4 border-b border-white/10 bg-black/40 flex items-center justify-between backdrop-blur-md z-10">
                <div className="flex items-center space-x-3">
                    <div className="relative">
                        <div className="w-2.5 h-2.5 bg-status-success rounded-full"></div>
                        <div className="absolute inset-0 bg-status-success rounded-full animate-ping opacity-75"></div>
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-sm tracking-wide">SECURE_CHANNEL // AI_ASSISTANT</h3>
                        <p className="text-[10px] text-text-tertiary font-mono">ENCRYPTED • ONLINE • v2.4.0</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {messages.length > 0 && (
                        <button
                            onClick={clearChat}
                            className="p-2 hover:bg-white/10 rounded-lg text-text-tertiary hover:text-status-danger transition-colors"
                            title="Limpiar chat"
                        >
                            <TrashIcon className="w-4 h-4" />
                        </button>
                    )}
                    <div className="px-2 py-1 bg-white/5 rounded text-[10px] font-mono text-accent-primary border border-accent-primary/20">
                        GEMINI_PRO
                    </div>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar scroll-smooth">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-text-tertiary space-y-4 opacity-50">
                        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                            <SparklesIcon className="w-8 h-8 text-accent-secondary" />
                        </div>
                        <div className="text-center font-mono text-xs">
                            <p className="mb-1">CANAL SEGURO ESTABLECIDO</p>
                            <p>Esperando consulta inicial...</p>
                        </div>
                    </div>
                )}

                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                        <div className={`max-w-[85%] rounded-2xl p-5 shadow-lg border relative ${msg.role === 'user'
                                ? 'bg-accent-primary/10 border-accent-primary/30 text-white rounded-br-none'
                                : 'bg-black/60 border-white/10 text-text-secondary rounded-bl-none'
                            }`}>
                            {msg.role === 'assistant' && (
                                <span className="absolute -top-3 left-0 text-[10px] font-mono font-bold text-accent-secondary bg-black px-2 py-0.5 border border-white/10 rounded ml-4">
                                    AI_RESPONSE
                                </span>
                            )}

                            <p className={`leading-relaxed whitespace-pre-wrap text-sm ${msg.role === 'assistant' ? 'font-mono' : 'font-sans'}`}>
                                {msg.content}
                            </p>

                            {/* Sources */}
                            {msg.sources && msg.sources.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-white/5">
                                    <p className="text-[10px] text-text-tertiary uppercase font-bold mb-2 tracking-wider flex items-center gap-1">
                                        <span>⚡</span> Fuentes Detectadas:
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {msg.sources.map((src, i) => (
                                            <a key={i} href={src.url} target="_blank" rel="noopener noreferrer"
                                                className="
                                                    text-[10px] bg-white/5 hover:bg-white/10 text-accent-blue px-2 py-1 rounded 
                                                    border border-white/5 transition-colors truncate max-w-[150px] font-mono hover:border-accent-blue/50
                                                ">
                                                {src.title || 'Documento Referenciado'}
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-black/60 rounded-2xl p-4 border border-white/10 flex items-center gap-1 rounded-bl-none">
                            <span className="text-xs font-mono text-accent-secondary mr-2">PROCESANDO</span>
                            <div className="w-1.5 h-1.5 bg-accent-secondary rounded-full animate-pulse"></div>
                            <div className="w-1.5 h-1.5 bg-accent-secondary rounded-full animate-pulse delay-75"></div>
                            <div className="w-1.5 h-1.5 bg-accent-secondary rounded-full animate-pulse delay-150"></div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSearch} className="p-4 bg-black/40 border-t border-white/10 relative z-20">
                <div className="relative group">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Escriba su consulta financiera..."
                        className="
                            w-full bg-white/5 text-white border border-white/10 rounded-xl py-3 pl-4 pr-12 
                            focus:outline-none focus:border-accent-primary/50 focus:ring-1 focus:ring-accent-primary/50
                            placeholder:text-text-tertiary font-mono text-sm transition-all
                            group-focus-within:bg-black/80
                        "
                    />
                    <button
                        type="submit"
                        disabled={loading || !query.trim()}
                        className="
                            absolute right-2 top-1/2 transform -translate-y-1/2 p-2 
                            text-accent-primary hover:text-white disabled:opacity-50 disabled:cursor-not-allowed 
                            transition-all hover:scale-110
                        "
                    >
                        <PaperAirplaneIcon className="w-5 h-5" />
                    </button>
                </div>
            </form>
        </div>
    );
};
