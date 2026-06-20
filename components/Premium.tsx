import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from '../hooks/useTranslation';
import { useRevenueCat } from './layout/RevenueCatProvider';
import { PACKAGE_TYPE } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';
import { PREMIUM_CHECKOUT_ENABLED } from '../config/constants';
import { HelpTooltip } from './ui/HelpTooltip';

interface PremiumProps {
  onMenuClick: () => void;
}

type PlanId = 'trip' | 'monthly' | 'annual' | 'lifetime';

const REFERENCE_PRICES: Record<PlanId, string> = {
  trip: '$4.99',
  monthly: '$7.99',
  annual: '$79.99',
  lifetime: '$149.99',
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { y: 16, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: 'spring', stiffness: 100 },
  },
};

export const Premium: React.FC<PremiumProps> = ({ onMenuClick }) => {
  const { t } = useTranslation();
  const { offerings, isPremium, purchasePackage, restorePurchases } = useRevenueCat();
  const [selectedPlan, setSelectedPlan] = useState<PlanId>('annual');
  const [isPurchasing, setIsPurchasing] = useState(false);

  const checkoutLive =
    PREMIUM_CHECKOUT_ENABLED && Capacitor.isNativePlatform() && Boolean(offerings?.length);

  const annualPackage = offerings?.find((pkg) => pkg.packageType === PACKAGE_TYPE.ANNUAL);
  const monthlyPackage = offerings?.find((pkg) => pkg.packageType === PACKAGE_TYPE.MONTHLY);
  const lifetimePackage = offerings?.find((pkg) => pkg.packageType === PACKAGE_TYPE.LIFETIME);

  const planPrice = (plan: PlanId): string => {
    if (!checkoutLive) return REFERENCE_PRICES[plan];
    if (plan === 'monthly') return monthlyPackage?.product.priceString || REFERENCE_PRICES.monthly;
    if (plan === 'annual') return annualPackage?.product.priceString || REFERENCE_PRICES.annual;
    if (plan === 'lifetime') return lifetimePackage?.product.priceString || REFERENCE_PRICES.lifetime;
    return REFERENCE_PRICES.trip;
  };

  const benefits = [
    { icon: 'shield_moon', titleKey: 'benefit1Title', descKey: 'benefit1Desc' },
    { icon: 'psychology', titleKey: 'benefit2Title', descKey: 'benefit2Desc' },
    { icon: 'record_voice_over', titleKey: 'benefit3Title', descKey: 'benefit3Desc' },
    { icon: 'route', titleKey: 'benefit4Title', descKey: 'benefit4Desc' },
    { icon: 'history', titleKey: 'benefit8Title', descKey: 'benefit8Desc' },
    { icon: 'sell', titleKey: 'benefit5Title', descKey: 'benefit5Desc' },
    { icon: 'download', titleKey: 'benefit6Title', descKey: 'benefit6Desc' },
    { icon: 'groups', titleKey: 'benefit7Title', descKey: 'benefit7Desc' },
    { icon: 'offline_bolt', titleKey: 'benefit9Title', descKey: 'benefit9Desc' },
  ];

  const userTypes = [
    { icon: 'hiking', titleKey: 'userTypeFreeTitle', descKey: 'userTypeFreeDesc', tooltipKey: 'tooltipFreeAccount', accent: 'border-overlay/15 bg-surface-dark' },
    { icon: 'luggage', titleKey: 'userTypeTripTitle', descKey: 'userTypeTripDesc', tooltipKey: 'tooltipTripAccount', accent: 'border-primary/25 bg-primary/5' },
    { icon: 'workspace_premium', titleKey: 'userTypePremiumTitle', descKey: 'userTypePremiumDesc', tooltipKey: 'tooltipPremiumAccount', accent: 'border-amber-500/25 bg-amber-500/5' },
  ];

  const compareRows: { labelKey: string; freeKey: string; premiumKey: string; tooltipKey?: string }[] = [
    { labelKey: 'compareCatalog', freeKey: 'compareIncluded', premiumKey: 'compareIncluded' },
    { labelKey: 'compareChat', freeKey: 'compareChatFree', premiumKey: 'compareChatPremium', tooltipKey: 'tooltipCompareChat' },
    { labelKey: 'compareRanger', freeKey: 'compareRangerFree', premiumKey: 'compareRangerPremium', tooltipKey: 'tooltipCompareRanger' },
    { labelKey: 'compareLive', freeKey: 'compareLiveFree', premiumKey: 'compareLivePremium', tooltipKey: 'tooltipCompareLive' },
    { labelKey: 'comparePlanner', freeKey: 'comparePlannerFree', premiumKey: 'comparePlannerPremium', tooltipKey: 'tooltipComparePlanner' },
    { labelKey: 'compareCoupons', freeKey: 'compareNotIncluded', premiumKey: 'compareIncluded', tooltipKey: 'tooltipCompareCoupons' },
    { labelKey: 'comparePdfs', freeKey: 'compareNotIncluded', premiumKey: 'compareIncluded' },
    { labelKey: 'compareLedger', freeKey: 'compareLedgerFree', premiumKey: 'compareLedgerPremium', tooltipKey: 'tooltipCompareLedger' },
  ];

  const handleSubscribe = async () => {
    if (!checkoutLive || isPremium || isPurchasing) return;

    let pkgToPurchase;
    if (selectedPlan === 'annual') pkgToPurchase = annualPackage;
    else if (selectedPlan === 'monthly') pkgToPurchase = monthlyPackage;
    else if (selectedPlan === 'lifetime') pkgToPurchase = lifetimePackage;
    else pkgToPurchase = undefined;

    if (!pkgToPurchase) {
      alert(t('premium.packageUnavailable'));
      return;
    }

    setIsPurchasing(true);
    await purchasePackage(pkgToPurchase);
    setIsPurchasing(false);
  };

  const planCardClass = (plan: PlanId, featured?: boolean) => {
    const selected = selectedPlan === plan;
    if (featured && selected) {
      return 'border-primary bg-gradient-to-br from-primary/10 to-transparent dark:from-primary/20 shadow-xl shadow-primary/10 scale-[1.02]';
    }
    if (plan === 'lifetime' && selected) {
      return 'border-yellow-500 bg-gradient-to-br from-yellow-500/10 to-transparent shadow-xl shadow-yellow-500/10 scale-[1.02]';
    }
    if (selected) {
      return 'border-primary bg-primary/5 dark:bg-primary/10 shadow-lg scale-[1.01]';
    }
    return 'border-gray-200 bg-white dark:border-overlay/10 dark:bg-premium-surface-dark';
  };

  return (
    <div className="relative h-full w-full max-w-md mx-auto flex flex-col bg-background-light dark:bg-premium-bg-dark font-display text-premium-secondary dark:text-content antialiased overflow-hidden shadow-xl sm:border-x sm:border-overlay/10">
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar relative w-full">
        <button
          type="button"
          onClick={onMenuClick}
          className="sticky top-safe left-4 z-50 -mb-10 flex items-center justify-center size-10 rounded-full text-white bg-black/35 backdrop-blur-md border border-white/15 hover:bg-black/50 shadow-lg transition-all active:scale-95 ml-4"
        >
          <span className="material-symbols-outlined text-2xl">menu</span>
        </button>

        <div className="relative -mt-10 h-[min(46vh,440px)] min-h-[300px] w-full overflow-hidden rounded-b-[40px] shadow-2xl shadow-premium-secondary/15 shrink-0">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage:
                'url("https://lh3.googleusercontent.com/aida-public/AB6AXuD7EvBKtlXwZblN2Llz5bQ0mQ-m5T0fUqlEoi4bDgqErk2glkwPat8V5dTTCJHVPMUQeoHkJgAKW4CoRDl9wLaIYgN50goOdGOD7dKUGKOfA-isHxCizKHHYDT5Kyh9WdVxStuQ3mape3f5NUK6tCtjnN3RUejRXIJINGbyRhO-PpxXwj6jTP_ZEHWpX3EtZ9RQnsM1zPaaFNmHE6afQlHQpL-aO2Cdb8K4eYzheP_vF4eIMvgdHyx-x9qhsOVY-WE558bxSXmTiV-3")',
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/45 to-background-light dark:to-premium-bg-dark" />

          <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center justify-end px-6 pb-10 pt-16 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-orange-400 p-0.5 shadow-lg shadow-orange-500/30">
              <div className="px-4 py-1 bg-black/50 rounded-full backdrop-blur-md">
                <span className="text-xs font-black uppercase tracking-widest text-white flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px] filled-icon text-yellow-400">workspace_premium</span>
                  {t('premium.badge')}
                </span>
              </div>
            </div>
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.55)] md:text-5xl">
              {t('premium.titleStart')} <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-200 to-primary drop-shadow-none">
                {t('premium.titleEnd')}
              </span>
            </h1>
            <p className="mt-4 text-base font-medium leading-relaxed text-white/90 max-w-sm mx-auto drop-shadow-[0_1px_8px_rgba(0,0,0,0.45)]">
              {t('premium.desc')}
            </p>
          </div>
        </div>

        <div className="flex flex-col px-5 pt-8 pb-8 gap-8">
          {!checkoutLive && (
            <div className="rounded-2xl border border-primary/25 bg-primary/10 px-4 py-4 flex gap-3 items-start">
              <span className="material-symbols-outlined text-primary text-[22px] shrink-0 mt-0.5">storefront</span>
              <div>
                <p className="text-sm font-bold text-content">{t('premium.storesComingSoonTitle')}</p>
                <p className="text-[12px] text-content-muted leading-relaxed mt-1">{t('premium.storesComingSoonDesc')}</p>
              </div>
            </div>
          )}

          <section className="flex flex-col gap-3">
            <div className="px-1 flex items-center gap-1.5">
              <h2 className="text-sm font-bold uppercase tracking-wider text-content-muted dark:text-content-subtle">
                {t('premium.userTypesTitle')}
              </h2>
              <HelpTooltip label={t('premium.helpLabel')} content={t('premium.tooltipUserTypes')} />
            </div>
            <div className="flex flex-col gap-3">
              {userTypes.map((type) => (
                <div
                  key={type.titleKey}
                  className={`rounded-2xl border p-4 flex gap-3 ${type.accent}`}
                >
                  <div className="size-10 rounded-xl bg-overlay/10 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-primary">{type.icon}</span>
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-content flex items-center gap-1.5 flex-wrap">
                      {t(`premium.${type.titleKey}`)}
                      <HelpTooltip
                        label={t('premium.helpLabel')}
                        content={t(`premium.${type.tooltipKey}`)}
                      />
                    </h3>
                    <p className="text-[12px] text-content-muted leading-relaxed mt-1">{t(`premium.${type.descKey}`)}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="px-1 text-sm font-bold uppercase tracking-wider text-content-muted dark:text-content-subtle">
              {t('premium.compareTitle')}
            </h2>
            <div className="rounded-2xl border border-overlay/10 overflow-hidden bg-surface-dark/50">
              <div className="grid grid-cols-[1.4fr_0.8fr_0.8fr] gap-2 px-3 py-2.5 bg-overlay/5 text-[10px] font-black uppercase tracking-wider text-content-muted border-b border-overlay/10">
                <span />
                <span className="text-center">{t('premium.compareFree')}</span>
                <span className="text-center text-primary">{t('premium.comparePremium')}</span>
              </div>
              {compareRows.map((row) => (
                <div
                  key={row.labelKey}
                  className="grid grid-cols-[1.4fr_0.8fr_0.8fr] gap-2 px-3 py-2.5 border-b border-overlay/5 last:border-0 text-[11px]"
                >
                  <span className="text-content-secondary font-medium leading-snug inline-flex items-center gap-1 flex-wrap">
                    {t(`premium.${row.labelKey}`)}
                    {row.tooltipKey && (
                      <HelpTooltip
                        label={t('premium.helpLabel')}
                        content={t(`premium.${row.tooltipKey}`)}
                        align="end"
                      />
                    )}
                  </span>
                  <span className="text-center text-content-muted">{t(`premium.${row.freeKey}`)}</span>
                  <span className="text-center text-content font-semibold">{t(`premium.${row.premiumKey}`)}</span>
                </div>
              ))}
            </div>
          </section>

          <div className="h-px w-full bg-gray-100 dark:bg-overlay/5" />

          <section className="flex flex-col gap-4">
            <div>
              <h2 className="px-1 text-sm font-bold uppercase tracking-wider text-content-muted dark:text-content-subtle">
                {t('premium.planTitle')}
              </h2>
              {!checkoutLive && (
                <p className="px-1 mt-2 text-[11px] text-content-muted leading-relaxed">{t('premium.referencePricesNote')}</p>
              )}
            </div>

            <label className={`relative flex cursor-pointer flex-col gap-3 rounded-3xl border-2 p-5 transition-all duration-300 ${planCardClass('trip', true)}`}>
              <input type="radio" name="pricing" className="sr-only" checked={selectedPlan === 'trip'} onChange={() => setSelectedPlan('trip')} />
              <div className="absolute -top-3 left-6 rounded-full bg-gradient-to-r from-primary to-orange-500 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-content shadow-lg shadow-orange-500/40">
                {t('premium.tripBenefit')}
              </div>
              <div className="flex items-center justify-between pt-1">
                <div className="flex flex-col">
                  <span className="text-lg font-bold text-premium-secondary dark:text-content inline-flex items-center gap-1.5 flex-wrap">
                    {t('premium.tripTitle')}
                    <HelpTooltip label={t('premium.helpLabel')} content={t('premium.tooltipTripPass')} />
                  </span>
                  <span className="text-xs text-premium-secondary/50 dark:text-content-muted mt-1">{t('premium.tripFlex')}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-3xl font-black tracking-tight text-premium-secondary dark:text-content">{planPrice('trip')}</span>
                  <span className="text-xs font-bold text-premium-secondary/50 dark:text-content-muted">{t('premium.tripPeriod')}</span>
                </div>
              </div>
            </label>

            <label className={`relative flex cursor-pointer items-center justify-between rounded-3xl border-2 p-5 transition-all duration-300 ${planCardClass('monthly')}`}>
              <input type="radio" name="pricing" className="sr-only" checked={selectedPlan === 'monthly'} onChange={() => setSelectedPlan('monthly')} />
              <div className="flex flex-col gap-1">
                <span className="text-base font-bold text-premium-secondary dark:text-content inline-flex items-center gap-1.5">
                  {t('premium.monthlyTitle')}
                  <HelpTooltip label={t('premium.helpLabel')} content={t('premium.tooltipRecurring')} />
                </span>
                <span className="text-xs text-premium-secondary/50 dark:text-content-muted">{t('premium.monthlyFlex')}</span>
              </div>
              <div className="flex items-end gap-1">
                <span className="text-xl font-black tracking-tight text-premium-secondary dark:text-content">{planPrice('monthly')}</span>
                <span className="mb-1 text-xs font-bold text-premium-secondary/50 dark:text-content-muted">{t('premium.monthlyPeriod')}</span>
              </div>
            </label>

            <label className={`relative flex cursor-pointer flex-col gap-3 rounded-3xl border-2 p-5 transition-all duration-300 ${planCardClass('annual', true)}`}>
              <input type="radio" name="pricing" className="sr-only" checked={selectedPlan === 'annual'} onChange={() => setSelectedPlan('annual')} />
              <div className="absolute -top-3 left-6 rounded-full bg-gradient-to-r from-primary to-orange-500 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-content shadow-lg shadow-orange-500/40">
                {t('premium.annualBenefit')}
              </div>
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-lg font-bold text-premium-secondary dark:text-content inline-flex items-center gap-1.5 flex-wrap">
                    {t('premium.annualTitle')}
                    <HelpTooltip label={t('premium.helpLabel')} content={t('premium.tooltipRecurring')} />
                  </span>
                  <span className="text-xs font-bold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-md w-fit mt-1">
                    {t('premium.annualSave')}
                  </span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-3xl font-black tracking-tight text-premium-secondary dark:text-content">{planPrice('annual')}</span>
                  <span className="text-xs font-bold text-premium-secondary/50 dark:text-content-muted">{t('premium.annualPeriod')}</span>
                </div>
              </div>
            </label>

            <label className={`relative flex cursor-pointer flex-col gap-3 rounded-3xl border-2 p-5 transition-all duration-300 ${planCardClass('lifetime')}`}>
              <input type="radio" name="pricing" className="sr-only" checked={selectedPlan === 'lifetime'} onChange={() => setSelectedPlan('lifetime')} />
              <div className="absolute -top-3 left-6 rounded-full bg-gradient-to-r from-yellow-500 to-amber-600 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-content shadow-lg shadow-yellow-500/40">
                {t('premium.lifetimeBenefit')}
              </div>
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-lg font-bold text-premium-secondary dark:text-content inline-flex items-center gap-1.5 flex-wrap">
                    {t('premium.lifetimeTitle')}
                    <HelpTooltip label={t('premium.helpLabel')} content={t('premium.tooltipLifetime')} />
                  </span>
                  <span className="text-xs font-bold text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 px-2 py-0.5 rounded-md w-fit mt-1">
                    {t('premium.lifetimePeriod')}
                  </span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-3xl font-black tracking-tight text-premium-secondary dark:text-content">{planPrice('lifetime')}</span>
                  <span className="text-xs font-bold text-premium-secondary/50 dark:text-content-muted">{t('premium.once')}</span>
                </div>
              </div>
            </label>
          </section>

          <div className="h-px w-full bg-gray-100 dark:bg-overlay/5" />

          <section className="flex flex-col gap-6">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-primary/60">{t('premium.benefitsTitle')}</h2>
              <div className="h-px flex-1 bg-overlay/5 ml-4" />
            </div>

            <motion.div variants={containerVariants} initial="hidden" animate="visible" className="flex flex-col gap-3">
              {benefits.map((benefit) => (
                <motion.div
                  key={benefit.titleKey}
                  variants={itemVariants}
                  className="group relative flex items-start gap-4 p-5 rounded-3xl bg-white border border-gray-100 shadow-sm dark:bg-white/[0.03] dark:border-white/[0.05] hover:border-primary/30 dark:hover:bg-white/[0.05] transition-all duration-500"
                >
                  <div className="absolute -right-4 -top-4 w-16 h-16 bg-primary/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-primary shadow-lg shadow-primary/5 group-hover:bg-primary group-hover:text-black transition-all duration-500">
                    <span className="material-symbols-outlined text-2xl">{benefit.icon}</span>
                  </div>
                  <div className="flex flex-col gap-1.5 pt-0.5 min-w-0">
                    <h3 className="text-sm font-black uppercase tracking-wider text-content group-hover:text-primary transition-colors">
                      {t(`premium.${benefit.titleKey}`)}
                    </h3>
                    <p className="text-[13px] font-medium text-content-muted leading-relaxed group-hover:text-content-secondary transition-colors">
                      {t(`premium.${benefit.descKey}`)}
                    </p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </section>

          <div className="flex justify-center items-center gap-2 text-xs text-content-muted opacity-60 pb-2">
            <span className="material-symbols-outlined text-[14px]">lock</span>
            {t('premium.secure')}
          </div>
        </div>
      </div>

      <div className="shrink-0 z-50 p-6 bg-gradient-to-t from-background-light via-background-light/98 to-transparent dark:from-background-dark dark:via-background-dark/98 backdrop-blur-sm pt-6 pb-safe border-t border-overlay/5">
        <div className="flex flex-col gap-3 max-w-md mx-auto">
          {isPremium ? (
            <div className="w-full h-14 rounded-2xl bg-green-500/10 border border-green-500/30 flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-green-500 filled-icon">verified</span>
              <span className="text-lg font-bold text-green-500 tracking-wide">{t('premium.activeMembership')}</span>
            </div>
          ) : checkoutLive ? (
            <button
              type="button"
              onClick={handleSubscribe}
              disabled={isPurchasing}
              className="group relative w-full h-14 overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-orange-600 shadow-xl shadow-primary/30 active:scale-[0.98] transition-all disabled:opacity-70"
            >
              <div className="relative flex items-center justify-center gap-3 h-full">
                <span className="text-lg font-bold text-content tracking-wide">
                  {isPurchasing ? t('premium.processing') : t('premium.subscribe')}
                </span>
                {!isPurchasing && (
                  <span className="material-symbols-outlined text-content text-[22px] group-hover:translate-x-1 transition-transform">
                    rocket_launch
                  </span>
                )}
                {isPurchasing && (
                  <span className="material-symbols-outlined text-content text-[22px] animate-spin">progress_activity</span>
                )}
              </div>
            </button>
          ) : (
            <div className="w-full min-h-14 rounded-2xl border border-overlay/15 bg-surface-dark flex flex-col items-center justify-center gap-1 px-4 py-3">
              <span className="material-symbols-outlined text-primary text-[22px]">store</span>
              <span className="text-sm font-bold text-content text-center">{t('premium.storesComingSoonCta')}</span>
            </div>
          )}

          <div className="flex flex-col items-center gap-1">
            <p className="text-center text-[11px] font-medium text-premium-secondary/60 dark:text-content-muted">
              {isPremium ? t('premium.thankYouVip') : t('premium.subscribeSub')}
            </p>
            {!isPremium && checkoutLive && (
              <button
                type="button"
                onClick={restorePurchases}
                className="text-[10px] uppercase tracking-widest font-bold text-primary/70 hover:text-primary transition-colors"
              >
                {t('premium.restore')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
