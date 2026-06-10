import React from 'react';
import { useTranslation } from '../../hooks/useTranslation';

export interface TacticalMessage {
    id: string;
    role: 'user' | 'assistant';
    text: string;
}

interface TacticalThreadProps {
    messages: TacticalMessage[];
    loading: boolean;
}

export const TacticalThread: React.FC<TacticalThreadProps> = ({ messages, loading }) => {
    const { t } = useTranslation();

    if (messages.length === 0 && !loading) return null;

    return (
        <div className="rounded-xl bg-surface-dark border border-overlay/5 overflow-hidden">
            <div className="px-3 py-2 border-b border-overlay/5 flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-green-500/70">forum</span>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-content-subtle">
                    {t('environmental.tacticalThread')}
                </p>
            </div>
            <div className="max-h-48 overflow-y-auto p-3 space-y-2.5 no-scrollbar">
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`max-w-[90%] rounded-2xl px-3 py-2 text-[11px] leading-relaxed ${
                                msg.role === 'user'
                                    ? 'bg-primary/20 text-content border border-primary/25 rounded-tr-sm'
                                    : 'bg-overlay/10 text-content-secondary border border-overlay/10 rounded-tl-sm'
                            }`}
                        >
                            {msg.role === 'user' && (
                                <p className="text-[8px] font-black uppercase tracking-widest text-primary mb-1">
                                    {t('environmental.you')}
                                </p>
                            )}
                            <p className="whitespace-pre-wrap">{msg.text}</p>
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex justify-start">
                        <div className="rounded-2xl rounded-tl-sm px-3 py-2 bg-overlay/10 border border-overlay/10">
                            <p className="text-[10px] text-content-muted animate-pulse">
                                {t('environmental.rangerTyping')}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
