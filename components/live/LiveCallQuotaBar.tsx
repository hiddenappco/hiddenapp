import React from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import type { LiveCallQuotaState } from '../../utils/liveCallQuota';
import { formatLiveMinutesSeconds } from '../../utils/liveCallQuota';

interface LiveCallQuotaBarProps {
    quota: LiveCallQuotaState;
    compact?: boolean;
    sessionSeconds?: number;
    showSession?: boolean;
}

export const LiveCallQuotaBar: React.FC<LiveCallQuotaBarProps> = ({
    quota,
    compact = false,
    sessionSeconds = 0,
    showSession = false,
}) => {
    const { t, isSpanish } = useTranslation();
    const remainingPct = Math.min(100, (quota.remainingSeconds / quota.limitSeconds) * 100);
    const resetDate = quota.periodEndsAt.toLocaleDateString(
        isSpanish ? 'es-CO' : 'en-US',
        { day: 'numeric', month: 'short' }
    );

    if (quota.isBlocked) {
        return (
            <div className="w-full max-w-sm rounded-2xl border border-red-500/25 bg-red-500/10 p-4 text-center">
                <span className="material-symbols-outlined text-red-400 text-2xl mb-2">hourglass_disabled</span>
                <p className="text-sm font-bold text-content">{t('live.quotaExceededTitle')}</p>
                <p className="text-[11px] text-content/60 mt-1 leading-relaxed">
                    {t('live.quotaExceededDesc', { date: resetDate })}
                </p>
            </div>
        );
    }

    return (
        <div className={`w-full max-w-sm rounded-2xl border border-overlay/10 bg-surface-dark/80 ${compact ? 'p-3' : 'p-4'}`}>
            <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-content/50">
                    {t('live.quotaLabel')}
                </span>
                <span className="text-[10px] font-bold text-primary tabular-nums">
                    {formatLiveMinutesSeconds(quota.remainingSeconds)} {t('live.quotaRemaining')}
                </span>
            </div>
            <div className="h-2 rounded-full bg-overlay/10 overflow-hidden">
                <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-500 transition-all duration-500"
                    style={{ width: `${remainingPct}%` }}
                />
            </div>
            <p className="text-[10px] text-content/45 mt-2 leading-relaxed">
                {t('live.quotaHint', {
                    used: formatLiveMinutesSeconds(quota.usedSeconds),
                    total: formatLiveMinutesSeconds(quota.limitSeconds),
                    date: resetDate,
                })}
            </p>
            {showSession && sessionSeconds > 0 && (
                <p className="text-[10px] text-emerald-400/90 font-bold mt-2 tabular-nums">
                    {t('live.sessionElapsed', { time: formatLiveMinutesSeconds(sessionSeconds) })}
                </p>
            )}
        </div>
    );
};
