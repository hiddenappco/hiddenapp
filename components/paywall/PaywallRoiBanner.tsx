import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../hooks/useTranslation';
import { formatCop } from '../../utils/currency';
import type { PaywallRoiEstimate } from '../../utils/paywallRoi';

export interface PaywallRoiBannerProps {
    estimate: PaywallRoiEstimate;
    /** i18n prefix, e.g. `paywallRoi` or `budget.paywallRoi` */
    i18nPrefix?: string;
    title?: string;
    subtitle?: string;
    onDismiss?: () => void;
    compact?: boolean;
    className?: string;
}

export const PaywallRoiBanner: React.FC<PaywallRoiBannerProps> = ({
    estimate,
    i18nPrefix = 'paywallRoi',
    title,
    subtitle,
    onDismiss,
    compact = false,
    className = '',
}) => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const savingsKey =
        estimate.confidence === 'exact'
            ? `${i18nPrefix}.savingsExact`
            : estimate.confidence === 'from'
              ? `${i18nPrefix}.savingsFrom`
              : `${i18nPrefix}.savingsExample`;

    const netMessage =
        estimate.netCop > 0
            ? t(`${i18nPrefix}.netPositive`, { amount: formatCop(estimate.netCop) })
            : t(`${i18nPrefix}.netBreakEven`);

    const resolvedTitle = title ?? t(`${i18nPrefix}.title`);
    const resolvedSubtitle = subtitle ?? t(`${i18nPrefix}.subtitle`);

    return (
        <section
            className={`rounded-2xl border border-amber-500/30 dark:border-amber-500/25 bg-gradient-to-br from-amber-500/12 via-surface-alt to-background-light dark:from-amber-500/10 dark:via-surface-dark dark:to-background-dark p-4 shadow-md shadow-black/5 dark:shadow-lg dark:shadow-black/20 ${compact ? 'p-3' : ''} ${className}`}
            aria-labelledby="paywall-roi-title"
        >
            <div className="flex items-start gap-3">
                <div className="touch-target shrink-0 size-10 rounded-xl bg-amber-500/15 border border-amber-500/35 dark:border-amber-500/30 flex items-center justify-center">
                    <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 filled-icon text-[20px]">
                        workspace_premium
                    </span>
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                        <h3 id="paywall-roi-title" className="text-sm font-black text-content leading-tight">
                            {resolvedTitle}
                        </h3>
                        {onDismiss && (
                            <button
                                type="button"
                                onClick={onDismiss}
                                className="touch-target shrink-0 size-8 rounded-lg text-content-muted hover:text-content hover:bg-overlay/10"
                                aria-label={t('common.cancel')}
                            >
                                <span className="material-symbols-outlined text-[18px]">close</span>
                            </button>
                        )}
                    </div>
                    {!compact && (
                        <p className="text-[11px] text-content-muted mt-1 leading-relaxed">{resolvedSubtitle}</p>
                    )}
                </div>
            </div>

            <div className="mt-3 space-y-1.5 rounded-xl bg-overlay/[0.04] dark:bg-black/20 border border-overlay/10 dark:border-white/[0.06] px-3 py-2.5">
                <p className="text-xs font-bold text-content truncate">
                    {t(`${i18nPrefix}.couponLine`, { title: estimate.couponTitle })}
                </p>
                <p className="text-sm font-extrabold text-amber-700 dark:text-amber-300">
                    {t(savingsKey, { amount: formatCop(estimate.savingsCop) })}
                </p>
                <p className="text-xs text-content-muted">
                    {t(`${i18nPrefix}.passLine`, { amount: formatCop(estimate.passPriceCop) })}
                </p>
                <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">{netMessage}</p>
            </div>

            <p className="mt-2 text-[10px] text-content-subtle leading-relaxed">
                {t(`${i18nPrefix}.disclaimer`)}
            </p>

            <div className={`mt-3 flex gap-2 ${compact ? 'flex-col sm:flex-row' : ''}`}>
                <button
                    type="button"
                    onClick={() => navigate('/premium')}
                    className="touch-target flex-1 h-11 rounded-xl bg-gradient-to-r from-primary to-[#E05D2B] text-white text-xs font-black uppercase tracking-wide shadow-md shadow-primary/25 active:scale-[0.98] transition-transform"
                >
                    {t(`${i18nPrefix}.cta`)}
                </button>
                <button
                    type="button"
                    onClick={() => navigate(`/coupons/${estimate.couponId}`)}
                    className="touch-target h-11 px-4 rounded-xl bg-overlay/5 dark:bg-overlay/10 border border-overlay/15 text-content text-xs font-bold hover:border-primary/30 transition-colors"
                >
                    {t(`${i18nPrefix}.viewCoupon`)}
                </button>
            </div>
        </section>
    );
};
