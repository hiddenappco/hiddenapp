import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from '../../hooks/useTranslation';
import type { ExpeditionStatus } from '../../hooks/useExpedition';
import {
    EXPEDITION_PIPELINE_STEPS,
    EXPEDITION_SKELETON_STRIP,
    expeditionStatusIndex,
    skeletonStripIndex,
} from '../../utils/expeditionPipelineSteps';

function SkeletonBar({ className }: { className?: string }) {
    return <div className={`rounded-lg bg-overlay/10 skeleton-shimmer ${className || ''}`} aria-hidden />;
}

interface ExpeditionSkeletonProps {
    status: ExpeditionStatus;
    days?: number;
    /** Full-page layout on the result route */
    fullScreen?: boolean;
    /** Compact card for chat widget */
    compact?: boolean;
    /** Elapsed ms since processing started (for notify CTA) */
    elapsedMs?: number;
    expeditionId?: string;
    notifyPending?: boolean;
    /** Transient acknowledgment after tapping the manual-refresh CTA */
    refreshing?: boolean;
    onRequestNotify?: () => void;
    onManualRefresh?: () => void;
}

export const ExpeditionSkeleton: React.FC<ExpeditionSkeletonProps> = ({
    status,
    days = 3,
    fullScreen = false,
    compact = false,
    elapsedMs = 0,
    notifyPending = false,
    refreshing = false,
    onRequestNotify,
    onManualRefresh,
}) => {
    const { t } = useTranslation();
    const activeIdx = expeditionStatusIndex(status);
    const stripIdx = skeletonStripIndex(status);
    const dayBlocks = useMemo(() => {
        const n = Math.min(Math.max(days, 1), compact ? 2 : 4);
        return Array.from({ length: n }, (_, i) => i + 1);
    }, [days, compact]);
    const stopsPerDay = compact ? 1 : 2;

    const showNotify = elapsedMs >= 60_000 && onRequestNotify && !notifyPending;
    const showNotifyDone = notifyPending;
    const showManualRefresh = elapsedMs >= 30_000 && onManualRefresh;

    const wrapperClass = fullScreen
        ? 'min-h-[60vh] flex flex-col'
        : compact
          ? 'rounded-2xl border border-primary/20 bg-surface-dark p-4'
          : 'rounded-2xl border border-primary/25 bg-surface-dark p-5';

    return (
        <div className={wrapperClass} role="status" aria-live="polite" aria-busy="true">
            {/* Pipeline status strip */}
            <div className="mb-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-2">
                    {t('expedition.skeletonHeadline')}
                </p>
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
                    {EXPEDITION_SKELETON_STRIP.map((step, i) => {
                        const done = stripIdx > i;
                        const active = stripIdx === i;
                        return (
                            <React.Fragment key={step.labelKey}>
                                {i > 0 && (
                                    <span className="text-content/25 select-none" aria-hidden>
                                        ·
                                    </span>
                                )}
                                <span
                                    className={
                                        active
                                            ? 'text-primary animate-pulse'
                                            : done
                                              ? 'text-content/55'
                                              : 'text-content/30'
                                    }
                                >
                                    {done && !active ? '✓ ' : ''}
                                    {t(step.labelKey)}
                                    {active ? '…' : ''}
                                </span>
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>

            {/* Hero + map placeholders */}
            <div className={`rounded-2xl border border-overlay/10 bg-overlay/5 overflow-hidden ${compact ? 'p-3' : 'p-4'} mb-4`}>
                <div className="flex items-center gap-2 mb-3">
                    <SkeletonBar className="size-5 rounded-full shrink-0" />
                    <SkeletonBar className="h-3 w-24" />
                </div>
                <SkeletonBar className={`h-5 mb-2 ${compact ? 'w-4/5' : 'w-2/3'}`} />
                <SkeletonBar className={`h-3 mb-4 ${compact ? 'w-full' : 'w-full max-w-md'}`} />
                <div
                    className={`relative rounded-xl overflow-hidden bg-overlay/5 border border-overlay/10 ${
                        compact ? 'aspect-[16/9]' : 'aspect-[2/1]'
                    }`}
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-overlay/5 via-overlay/10 to-overlay/5 animate-pulse" />
                    <div className="absolute inset-0 flex items-center justify-center gap-2 text-content/30">
                        <span className="material-symbols-outlined text-[22px]">map</span>
                        {!compact && (
                            <span className="text-[10px] font-bold uppercase tracking-widest">
                                {t('expedition.skeletonMapLabel')}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Budget chip skeleton */}
            {!compact && (
                <div className="rounded-xl border border-overlay/10 bg-overlay/5 p-3 mb-4 flex gap-3 items-center">
                    <SkeletonBar className="size-9 rounded-full shrink-0" />
                    <div className="flex-1 space-y-2">
                        <SkeletonBar className="h-3 w-28" />
                        <SkeletonBar className="h-4 w-40" />
                    </div>
                </div>
            )}

            {/* Day blocks */}
            <div className={`space-y-3 ${compact ? '' : 'mb-4'}`}>
                {dayBlocks.map((dayNum, dayIndex) => (
                    <motion.div
                        key={dayNum}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: dayIndex * 0.06 }}
                        className="rounded-xl border border-overlay/10 bg-overlay/5 overflow-hidden"
                    >
                        <div className={`flex items-center gap-2 ${compact ? 'px-2.5 py-2' : 'px-3 py-2.5'}`}>
                            <SkeletonBar className="size-7 rounded-full shrink-0" />
                            <div className="flex-1 space-y-1.5 min-w-0">
                                <SkeletonBar className="h-2 w-16" />
                                <SkeletonBar className={`h-3 ${compact ? 'w-3/4' : 'w-1/2'}`} />
                            </div>
                        </div>
                        <div className={`px-3 pb-3 space-y-2 ${compact ? 'px-2.5' : ''}`}>
                            {Array.from({ length: stopsPerDay }).map((_, stopIdx) => (
                                <div key={stopIdx} className="rounded-lg border border-overlay/10 bg-surface-dark/80 p-2.5 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <SkeletonBar className="size-4 rounded shrink-0" />
                                        <SkeletonBar className="h-3 w-32" />
                                    </div>
                                    <SkeletonBar className="h-2 w-full" />
                                    {!compact && <SkeletonBar className="h-2 w-4/5" />}
                                </div>
                            ))}
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Agent step list (compact detail) */}
            {!compact && (
                <div className="space-y-2 mb-2">
                    {EXPEDITION_PIPELINE_STEPS.map((step, i) => {
                        const stepOrder = expeditionStatusIndex(step.key);
                        const done = activeIdx > stepOrder;
                        const active = status === step.key || (status === 'queued' && i === 0);
                        return (
                            <div
                                key={step.key}
                                className={`flex items-center gap-2 rounded-lg px-2.5 py-2 border ${
                                    active
                                        ? 'border-primary/40 bg-primary/10'
                                        : done
                                          ? 'border-primary/15 bg-primary/5'
                                          : 'border-overlay/10 bg-transparent'
                                }`}
                            >
                                <span
                                    className={`material-symbols-outlined text-[16px] ${
                                        active ? 'text-primary animate-pulse' : done ? 'text-primary/70' : 'text-content/30'
                                    }`}
                                >
                                    {done ? 'check_circle' : step.icon}
                                </span>
                                <span className={`text-[10px] font-bold truncate ${active ? 'text-primary' : 'text-content/50'}`}>
                                    {t(step.labelKey)}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}

            <p className={`text-[10px] text-content/40 text-center ${compact ? 'mt-2' : 'mt-1'}`}>
                {t('expedition.skeletonHint')}
                {days ? ` · ${t('expedition.daysCount', { n: days })}` : ''}
            </p>

            {showManualRefresh && (
                <button
                    type="button"
                    onClick={onManualRefresh}
                    disabled={refreshing}
                    aria-live="polite"
                    className="mt-3 w-full text-center text-[11px] font-bold text-primary/80 hover:text-primary disabled:opacity-60"
                >
                    {refreshing
                        ? t('expedition.skeletonManualRefreshChecking')
                        : t('expedition.skeletonManualRefresh')}
                </button>
            )}

            {showNotifyDone && (
                <p className="mt-3 text-center text-[11px] text-emerald-400/90 font-semibold flex items-center justify-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">notifications_active</span>
                    {t('expedition.skeletonNotifyEnabled')}
                </p>
            )}

            {showNotify && (
                <button
                    type="button"
                    onClick={onRequestNotify}
                    className={`mt-3 w-full rounded-xl border border-primary/35 bg-primary/10 py-3 text-sm font-bold text-primary flex items-center justify-center gap-2 ${
                        compact ? 'text-[12px] py-2.5' : ''
                    }`}
                >
                    <span className="material-symbols-outlined text-[18px]">notifications</span>
                    {t('expedition.skeletonNotifyCta')}
                </button>
            )}
        </div>
    );
};
