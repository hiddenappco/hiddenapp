import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../../hooks/useTranslation';
import type { ExpeditionStatus } from '../../hooks/useExpedition';

const PIPELINE: Array<{
    key: ExpeditionStatus;
    icon: string;
    labelKey: string;
    detailKey: string;
}> = [
    { key: 'curating', icon: 'psychology', labelKey: 'expedition.agentCurator', detailKey: 'expedition.agentCuratorDetail' },
    { key: 'routing', icon: 'route', labelKey: 'expedition.agentLogistics', detailKey: 'expedition.agentLogisticsDetail' },
    { key: 'budgeting', icon: 'payments', labelKey: 'expedition.agentBudget', detailKey: 'expedition.agentBudgetDetail' },
    { key: 'writing', icon: 'edit_note', labelKey: 'expedition.agentWriter', detailKey: 'expedition.agentWriterDetail' },
];

const STATUS_ORDER: ExpeditionStatus[] = ['queued', 'curating', 'routing', 'budgeting', 'writing', 'ready'];

function stepIndex(status: ExpeditionStatus): number {
    const i = STATUS_ORDER.indexOf(status);
    return i < 0 ? 0 : i;
}

interface ExpeditionProgressProps {
    status: ExpeditionStatus;
    fullScreen?: boolean;
    days?: number;
}

export const ExpeditionProgress: React.FC<ExpeditionProgressProps> = ({
    status,
    fullScreen = false,
    days,
}) => {
    const { t } = useTranslation();
    const activeIdx = stepIndex(status);
    const activeAgent = PIPELINE.find((p) => p.key === status) ?? PIPELINE[0];

    const wrapperClass = fullScreen
        ? 'min-h-[70vh] flex flex-col items-center justify-center px-6 py-10'
        : 'rounded-2xl border border-primary/25 bg-surface-dark p-5';

    return (
        <div className={wrapperClass} role="status" aria-live="polite">
            <motion.div
                className="relative mb-8"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4 }}
            >
                <div className="size-24 rounded-full bg-gradient-to-br from-primary/30 to-primary/5 border border-primary/40 flex items-center justify-center shadow-[0_0_48px_rgba(224,93,43,0.25)]">
                    <motion.span
                        key={activeAgent.key}
                        initial={{ opacity: 0, rotate: -20 }}
                        animate={{ opacity: 1, rotate: 0 }}
                        className="material-symbols-outlined text-primary text-[40px]"
                    >
                        {activeAgent.icon}
                    </motion.span>
                </div>
                <motion.span
                    className="absolute inset-0 rounded-full border-2 border-primary/50"
                    animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0, 0.6] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                />
            </motion.div>

            <motion.p
                key={status}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-[10px] font-black uppercase tracking-[0.25em] text-primary mb-2"
            >
                {t('expedition.planningBadge')}
            </motion.p>

            <AnimatePresence mode="wait">
                <motion.h2
                    key={`title-${status}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25 }}
                    className="text-content text-lg font-bold text-center mb-2 max-w-sm"
                >
                    {t(activeAgent.labelKey)}
                </motion.h2>
            </AnimatePresence>

            <motion.p
                key={`detail-${status}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-content/65 text-[13px] text-center max-w-md leading-relaxed mb-8"
            >
                {t(activeAgent.detailKey)}
                {days ? ` · ${t('expedition.daysCount', { n: days })}` : ''}
            </motion.p>

            <div className="w-full max-w-md space-y-3">
                {PIPELINE.map((step, i) => {
                    const stepNum = i + 1;
                    const done = activeIdx > stepIndex(step.key);
                    const active = status === step.key || (status === 'queued' && i === 0);
                    return (
                        <motion.div
                            key={step.key}
                            initial={{ opacity: 0, x: -12 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.08 }}
                            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 border transition-colors duration-500 ${
                                active
                                    ? 'border-primary/50 bg-primary/10'
                                    : done
                                      ? 'border-primary/20 bg-primary/5'
                                      : 'border-overlay/10 bg-background-dark/40'
                            }`}
                        >
                            <div
                                className={`size-9 shrink-0 rounded-full flex items-center justify-center ${
                                    active ? 'bg-primary/25' : done ? 'bg-primary/15' : 'bg-overlay/10'
                                }`}
                            >
                                {done ? (
                                    <span className="material-symbols-outlined text-primary text-[18px]">check</span>
                                ) : (
                                    <span
                                        className={`material-symbols-outlined text-[18px] ${
                                            active ? 'text-primary animate-pulse' : 'text-content/40'
                                        }`}
                                    >
                                        {step.icon}
                                    </span>
                                )}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className={`text-[11px] font-bold ${active ? 'text-primary' : 'text-content/70'}`}>
                                    {t(step.labelKey)}
                                </p>
                                <p className="text-[10px] text-content/45 truncate">{t(step.detailKey)}</p>
                            </div>
                            {active && (
                                <motion.div
                                    className="flex gap-1 shrink-0"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                >
                                    {[0, 1, 2].map((d) => (
                                        <motion.span
                                            key={d}
                                            className="size-1.5 rounded-full bg-primary"
                                            animate={{ opacity: [0.3, 1, 0.3] }}
                                            transition={{ duration: 1, repeat: Infinity, delay: d * 0.2 }}
                                        />
                                    ))}
                                </motion.div>
                            )}
                        </motion.div>
                    );
                })}
            </div>

            <p className="text-[10px] text-content/35 text-center mt-8 max-w-xs">
                {t('expedition.enrichingHint')}
            </p>
        </div>
    );
};
