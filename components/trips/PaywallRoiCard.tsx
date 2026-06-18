import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../hooks/useTranslation';
import { useRevenueCat } from '../layout/RevenueCatProvider';
import { useCoupons, useDestinations } from '../../hooks/useFirestore';
import { formatCop } from '../../utils/currency';
import { pickPaywallRoiEstimate } from '../../utils/paywallRoi';
import type { Trip } from '../../types/trips';

interface PaywallRoiCardProps {
    activeTrip?: Trip | null;
}

export const PaywallRoiCard: React.FC<PaywallRoiCardProps> = ({ activeTrip }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { isPremium } = useRevenueCat();
    const { data: coupons, loading: loadingCoupons } = useCoupons();
    const { data: destinations, loading: loadingDests } = useDestinations();

    const estimate = useMemo(
        () =>
            pickPaywallRoiEstimate(coupons, destinations, {
                locationHint: activeTrip?.location,
            }),
        [coupons, destinations, activeTrip?.location]
    );

    if (isPremium) return null;
    if (loadingCoupons || loadingDests) return null;
    if (!estimate) return null;

    const savingsKey =
        estimate.confidence === 'exact'
            ? 'budget.paywallRoi.savingsExact'
            : estimate.confidence === 'from'
              ? 'budget.paywallRoi.savingsFrom'
              : 'budget.paywallRoi.savingsExample';

    const netMessage =
        estimate.netCop > 0
            ? t('budget.paywallRoi.netPositive', { amount: formatCop(estimate.netCop) })
            : t('budget.paywallRoi.netBreakEven');

    return (
        <section
            className="rounded-[24px] border border-amber-500/25 bg-gradient-to-br from-amber-500/10 via-surface-dark to-background-dark p-4 shadow-lg shadow-black/20"
            aria-labelledby="paywall-roi-title"
        >
            <div className="flex items-start gap-3">
                <div className="touch-target shrink-0 size-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
                    <span className="material-symbols-outlined text-amber-400 filled-icon text-[22px]">workspace_premium</span>
                </div>
                <div className="min-w-0 flex-1">
                    <h3 id="paywall-roi-title" className="text-sm font-black text-content leading-tight">
                        {t('budget.paywallRoi.title')}
                    </h3>
                    <p className="text-[11px] text-content-muted mt-1 leading-relaxed">
                        {t('budget.paywallRoi.subtitle')}
                    </p>
                </div>
            </div>

            <div className="mt-4 space-y-2 rounded-2xl bg-black/20 border border-white/[0.06] px-4 py-3">
                <p className="text-xs font-bold text-content truncate">
                    {t('budget.paywallRoi.couponLine', { title: estimate.couponTitle })}
                </p>
                <p className="text-sm font-extrabold text-amber-300">
                    {t(savingsKey, { amount: formatCop(estimate.savingsCop) })}
                </p>
                <p className="text-xs text-content-muted">
                    {t('budget.paywallRoi.passLine', { amount: formatCop(estimate.passPriceCop) })}
                </p>
                <p className="text-xs font-bold text-emerald-400">{netMessage}</p>
            </div>

            <p className="mt-3 text-[10px] text-content-subtle leading-relaxed px-0.5">
                {t('budget.paywallRoi.disclaimer')}
            </p>

            <div className="mt-4 flex gap-2">
                <button
                    type="button"
                    onClick={() => navigate('/premium')}
                    className="touch-target flex-1 h-12 rounded-xl bg-gradient-to-r from-primary to-[#E05D2B] text-white text-xs font-black uppercase tracking-wide shadow-md shadow-primary/25 active:scale-[0.98] transition-transform"
                >
                    {t('budget.paywallRoi.cta')}
                </button>
                <button
                    type="button"
                    onClick={() => navigate(`/coupons/${estimate.couponId}`)}
                    className="touch-target h-12 px-4 rounded-xl bg-overlay/10 border border-overlay/15 text-content text-xs font-bold hover:border-primary/30 transition-colors"
                >
                    {t('budget.paywallRoi.viewCoupon')}
                </button>
            </div>
        </section>
    );
};
