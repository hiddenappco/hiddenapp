import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Language } from '../types/core';
import { useTranslation } from '../hooks/useTranslation';
import { motion } from 'framer-motion';
import { useDepartment, useAssistant } from '../hooks/useFirestore';

interface AgentSelectorProps {
    language: Language;
    onBack: () => void;
}

export const AgentSelector: React.FC<AgentSelectorProps> = ({ language, onBack }) => {
    const { contextId } = useParams<{ contextId: string }>();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { data: department } = useDepartment(contextId || undefined);
    const { data: assistant } = useAssistant(contextId || undefined);

    const agentName = assistant?.name || t('agent.hiddenGuide');

    const texts = {
        title: t('agent.title'),
        subtitle: t('agent.subtitle', { name: agentName }),
        textTitle: t('agent.textTitle'),
        textDesc: t('agent.textDesc'),
        liveTitle: t('agent.liveTitle'),
        liveDesc: t('agent.liveDesc'),
        liveTag: t('agent.liveTag'),
    };

    // Dynamic, bulletproof fallback for department display name
    const getDepartmentDisplayName = () => {
        if (department?.name) return department.name;
        if (contextId?.includes('valle')) return 'Valle del Cauca';
        if (contextId?.includes('amazonas')) return 'Amazonas';
        return t('agent.localAgent');
    };

    // Beautiful dynamic avatar generator based on the department
    const getAgentAvatar = () => {
        const nameLower = department?.name?.toLowerCase() || '';
        const contextLower = contextId?.toLowerCase() || '';
        if (contextLower.includes('valle') || nameLower.includes('valle')) {
            return (
                <div className="size-9 rounded-full bg-gradient-to-br from-red-500 to-amber-500 flex items-center justify-center shadow-lg shadow-red-500/20 border border-overlay/10 shrink-0">
                    <span className="material-symbols-outlined text-[18px] text-content">music_note</span>
                </div>
            );
        }
        if (contextLower.includes('amazonas') || nameLower.includes('amazonas')) {
            return (
                <div className="size-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 border border-overlay/10 shrink-0">
                    <span className="material-symbols-outlined text-[18px] text-content">park</span>
                </div>
            );
        }
        return (
            <div className="size-9 rounded-full bg-gradient-to-br from-primary to-indigo-500 flex items-center justify-center shadow-lg shadow-primary/20 border border-overlay/10 shrink-0">
                <span className="material-symbols-outlined text-[18px] text-content">explore</span>
            </div>
        );
    };

    return (
        <div className="bg-background-dark font-display antialiased text-content h-screen w-full flex flex-col overflow-hidden relative">
            
            {/* Background Ambience */}
            <div className="absolute inset-0 pointer-events-none z-0">
                <div className="absolute top-[-20%] right-[-10%] w-[400px] h-[400px] bg-primary/5 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[300px] h-[300px] bg-indigo-500/5 rounded-full blur-[100px]"></div>
            </div>

            {/* Header */}
            <header className="sticky top-0 z-30 flex items-center bg-background-dark/95 backdrop-blur-md px-4 pb-2 pt-safe border-b border-overlay/5">
                <button
                    onClick={onBack}
                    className="flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-overlay/10 transition-colors text-content"
                >
                    <span className="material-symbols-outlined text-[24px]">arrow_back</span>
                </button>

                {/* Personalized Dynamic Header Micro-Interface */}
                <div className="flex-1 flex items-center gap-3 ml-2 min-w-0">
                    {getAgentAvatar()}
                    <div className="text-left min-w-0">
                        <div className="flex items-center gap-1.5">
                            <h2 className="text-sm font-extrabold text-content leading-tight truncate">
                                {agentName}
                            </h2>
                            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                        </div>
                        <p className="text-[10px] font-bold tracking-wider text-content-muted uppercase truncate leading-none mt-0.5">
                            {getDepartmentDisplayName()}
                        </p>
                    </div>
                </div>

                {/* App Brand Logo Top Right Corner */}
                <div className="shrink-0 flex items-center justify-center size-10 ml-auto mr-1">
                    <img src="/assets/ui/logo.png" alt="Hidden App Logo" className="h-6 w-auto object-contain" />
                </div>
            </header>

            {/* Main Content (Aligned naturally to the top with perfect padding to eliminate dead space) */}
            <main className="flex-1 overflow-y-auto no-scrollbar px-6 pt-10 pb-6 flex flex-col gap-6 z-10 max-w-md mx-auto w-full">
                
                {/* Title */}
                <div className="text-center pb-2">
                    <h1 className="text-xl font-extrabold text-content tracking-tight mb-1">{texts.title}</h1>
                    <p className="text-xs text-content-muted font-medium max-w-xs mx-auto">{texts.subtitle}</p>
                </div>

                {/* Text Chat Card (Ultra-Sleek & Compact Clickable Card) */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    onClick={() => navigate(`/chat/${contextId}`)}
                    className="w-full text-left cursor-pointer group relative overflow-hidden rounded-2xl border border-overlay/5 bg-white/[0.02] p-4 hover:bg-white/[0.04] hover:border-overlay/10 transition-all flex items-center gap-4"
                >
                    <div className="size-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <span className="material-symbols-outlined text-blue-400 text-[24px]">chat</span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-base font-bold text-content mb-0.5">{texts.textTitle}</h3>
                        <p className="text-xs text-content-muted leading-snug">{texts.textDesc}</p>
                    </div>
                    <span className="material-symbols-outlined text-content-subtle group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all shrink-0">
                        chevron_right
                    </span>
                </motion.div>

                {/* Live Mode Card (Ultra-Sleek, Open Access, Compact & Decorative Premium Badge) */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    onClick={() => navigate(`/live/${contextId}`)}
                    className="w-full text-left cursor-pointer group relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-indigo-500/5 p-4 hover:border-primary/40 hover:shadow-[0_0_20px_rgba(255,107,53,0.04)] transition-all flex flex-col gap-3"
                >
                    {/* Animated glow */}
                    <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-[40px] group-hover:bg-primary/10 transition-colors"></div>

                    <div className="flex items-center gap-4 relative z-10">
                        <div className="size-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                            <span className="material-symbols-outlined text-primary text-[24px]">mic</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                                <h3 className="text-base font-bold text-content">{texts.liveTitle}</h3>
                                {/* Golden/Amber Premium Reference Badge as dynamic decoration */}
                                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/30 text-[8px] font-black uppercase tracking-widest text-amber-500 shrink-0">
                                    {texts.liveTag}
                                </span>
                            </div>
                            <p className="text-xs text-content-muted leading-snug">{texts.liveDesc}</p>
                        </div>
                        <span className="material-symbols-outlined text-content-subtle group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0">
                            chevron_right
                        </span>
                    </div>

                    {/* Live mode features (Balanced and compact) */}
                    <div className="flex items-center gap-2 flex-wrap relative z-10 pl-16">
                        {[
                            { icon: 'graphic_eq', label: t('agent.liveFeatureVoice') },
                            { icon: 'speed', label: t('agent.liveFeatureRealtime') },
                            { icon: 'my_location', label: t('agent.liveFeatureGps') },
                        ].map((feat) => (
                            <span key={feat.icon} className="flex items-center gap-1 px-2 py-0.5 rounded bg-overlay/5 border border-overlay/5 text-[9px] font-bold text-content-muted uppercase tracking-wider">
                                <span className="material-symbols-outlined text-[10px] text-primary">{feat.icon}</span>
                                {feat.label}
                            </span>
                        ))}
                    </div>
                </motion.div>

            </main>
        </div>
    );
};
