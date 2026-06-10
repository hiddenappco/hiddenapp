import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../../hooks/useTranslation';

interface EnvironmentalThinkingBannerProps {
    visible: boolean;
}

export const EnvironmentalThinkingBanner: React.FC<EnvironmentalThinkingBannerProps> = ({ visible }) => {
    const { t } = useTranslation();

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="mx-4 -mb-1 flex items-center gap-3 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 shadow-[0_0_24px_rgba(59,130,246,0.15)]"
                    role="status"
                    aria-live="polite"
                >
                    <span className="relative flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-500/20">
                        <span className="material-symbols-outlined text-[20px] text-blue-400 animate-spin" style={{ animationDuration: '2.5s' }}>
                            radar
                        </span>
                        <span className="absolute inset-0 rounded-full border border-blue-400/40 animate-ping opacity-40" />
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">
                            {t('environmental.monitorThinkingTitle')}
                        </p>
                        <p className="text-[11px] font-medium text-content-secondary leading-snug">
                            {t('environmental.monitorThinkingBody')}
                        </p>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
