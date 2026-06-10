import React from 'react';
import { useTranslation } from '../../hooks/useTranslation';

/** Renders **bold** and *italic* markdown spans from the Ranger analysis. */
const renderInlineMarkdown = (text: string): React.ReactNode[] => {
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*\n]+\*)/g);
    return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
            return <strong key={i} className="font-bold">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
            return <em key={i}>{part.slice(1, -1)}</em>;
        }
        return part;
    });
};

interface IntelligenceAdviceProps {
    isMonitoring: boolean;
    loadingEnv: boolean;
    selectedId: string;
    advice: string;
    adviceUpdatedAt?: Date | null;
    isOffline?: boolean;
    fromCache?: boolean;
}

export const IntelligenceAdvice: React.FC<IntelligenceAdviceProps> = ({
    isMonitoring,
    loadingEnv,
    selectedId,
    advice,
    adviceUpdatedAt,
    isOffline,
    fromCache,
}) => {
    const { t } = useTranslation();

    const ageLabel =
        adviceUpdatedAt && !isNaN(adviceUpdatedAt.getTime())
            ? adviceUpdatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : null;

    return (
        <div className="relative overflow-hidden rounded-xl bg-surface-dark border border-overlay/5 p-4">
            {loadingEnv && (
                <div className="absolute inset-x-0 bottom-0 h-[1px] bg-blue-500 animate-[loading-progress_2s_infinite]"></div>
            )}
            <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2 opacity-60 min-w-0">
                    <span className="material-symbols-outlined text-[16px] text-green-500/70 shrink-0">verified_user</span>
                    <p className={`text-[9px] ${isMonitoring ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'} uppercase tracking-[0.2em] font-black truncate`}>
                        {isMonitoring ? t('environmental.autoAnalysis') : t('environmental.systemStandby')}
                    </p>
                </div>
                {isMonitoring && ageLabel && (
                    <span className="text-[8px] font-bold uppercase tracking-wider text-content-subtle shrink-0">
                        {(isOffline || fromCache)
                            ? t('environmental.cachedAt', { time: ageLabel })
                            : t('environmental.updatedAt', { time: ageLabel })}
                    </span>
                )}
            </div>
            <p className={`text-[13px] text-content leading-relaxed font-display font-medium whitespace-pre-wrap transition-opacity duration-300 ${loadingEnv ? 'opacity-50' : 'opacity-100'}`}>
                {!isMonitoring
                    ? t('environmental.standbyHint')
                    : (!selectedId
                        ? t('environmental.selectDestination')
                        : (advice ? renderInlineMarkdown(advice) : t('environmental.analyzingSatellite')))}
            </p>
        </div>
    );
};
