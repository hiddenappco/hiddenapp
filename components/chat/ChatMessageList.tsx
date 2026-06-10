import React from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChatMessage } from '../../types/chat';
import { useTranslation } from '../../hooks/useTranslation';

interface ChatMessageListProps {
    messages: ChatMessage[];
    sessionStartTime: number;
    isSending: boolean;
    getAgentIcon: () => string;
    renderWidget: (widget: unknown, index: number) => React.ReactNode;
    scrollRef: React.RefObject<HTMLDivElement>;
    welcomeText: string;
}

/** Mensajes antiguos enviados como nota de voz (antes del modo solo texto). */
const LEGACY_VOICE_LABELS = new Set(['Nota de voz', 'Voice note']);

function isLegacyVoiceOnlyMessage(msg: ChatMessage): boolean {
    const content = msg.content?.trim() || '';
    if (LEGACY_VOICE_LABELS.has(content)) return true;
    if (msg.audioUrl && !content) return true;
    return false;
}

export const ChatMessageList: React.FC<ChatMessageListProps> = ({
    messages,
    sessionStartTime,
    isSending,
    getAgentIcon,
    scrollRef,
    welcomeText,
    renderWidget
}) => {
    const { t } = useTranslation();

    const renderUserContent = (msg: ChatMessage) => {
        if (isLegacyVoiceOnlyMessage(msg)) {
            return (
                <span className="italic opacity-80 text-sm">
                    {t('chat.legacyMessage')}
                </span>
            );
        }
        return (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {msg.content}
            </ReactMarkdown>
        );
    };

    return (
        <main ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-6 bg-background-dark relative">
            {messages.length === 0 && (
                <div className="flex items-end gap-3 animate-fade-in">
                    <div className="bg-primary/20 rounded-full w-8 h-8 flex items-center justify-center border border-primary/30 shrink-0 mb-1">
                        <span className="material-symbols-outlined text-primary text-sm">{getAgentIcon()}</span>
                    </div>
                    <div className="bg-surface-dark text-content px-4 py-3 rounded-2xl rounded-tl-sm text-base leading-relaxed shadow-sm border border-overlay/10 max-w-[85%]">
                        {welcomeText}
                    </div>
                </div>
            )}

            {messages.map((msg) => {
                const msgTime = msg.createdAt?.toMillis
                    ? msg.createdAt.toMillis()
                    : (msg.createdAt?.seconds ? msg.createdAt.seconds * 1000 : Date.now());
                const isFromCurrentSession = msgTime > sessionStartTime;

                return (
                    <div
                        key={msg.id}
                        className={`flex items-end gap-3 ${msg.role === 'user' ? 'justify-end animate-fade-in' : ''}`}
                    >
                        {msg.role === 'assistant' && (
                            <div className="bg-primary/20 rounded-full w-8 h-8 flex items-center justify-center border border-primary/30 shrink-0 mb-1">
                                <span className="material-symbols-outlined text-primary text-sm">{getAgentIcon()}</span>
                            </div>
                        )}

                        <div className={`flex flex-col gap-2 max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                            <div className={`
                                px-4 py-3 rounded-2xl text-base leading-relaxed shadow-sm border 
                                ${msg.role === 'user'
                                    ? 'bg-primary text-white rounded-tr-sm border-overlay/10'
                                    : 'bg-surface-dark text-content rounded-tl-sm border-overlay/10'}
                            `}>
                                <div className="prose prose-sm prose-slate dark:prose-invert max-w-none break-words">
                                    {msg.role === 'assistant' ? (
                                        <motion.div
                                            initial={isFromCurrentSession ? { opacity: 0, y: 10, scale: 0.95 } : false}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            transition={{ duration: 0.4, ease: "easeOut" }}
                                        >
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                {msg.content}
                                            </ReactMarkdown>
                                        </motion.div>
                                    ) : (
                                        renderUserContent(msg)
                                    )}
                                </div>
                            </div>

                            {msg.widgets && msg.widgets.length > 0 && (
                                <div className="w-full max-w-[85%] flex flex-col gap-1.5">
                                    {msg.widgets.length > 1 && (
                                        <p className="text-[9px] font-bold uppercase tracking-widest text-content/40 px-0.5">
                                            {t('chat.widgetCarousel', { count: msg.widgets.length })}
                                        </p>
                                    )}
                                    <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-1 pt-0.5 snap-x snap-mandatory -mx-1 px-1">
                                        {msg.widgets.map((widget, wi) => renderWidget(widget, wi))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}

            {isSending && (
                <div className="flex items-end gap-3 animate-pulse">
                    <div className="bg-surface-dark text-content px-4 py-2 rounded-2xl rounded-tl-sm text-sm border border-overlay/10">
                        {t('chat.thinking')}
                    </div>
                </div>
            )}
            <div className="h-24"></div>
        </main>
    );
};
