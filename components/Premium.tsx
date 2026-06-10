import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Language } from '../types/core';
import { useTranslation } from '../hooks/useTranslation';
import { useRevenueCat } from './layout/RevenueCatProvider';
import { PACKAGE_TYPE } from '@revenuecat/purchases-capacitor';

interface PremiumProps {
  language: Language;
  onMenuClick: () => void;
}

export const Premium: React.FC<PremiumProps> = ({ onMenuClick }) => {
  const { t } = useTranslation();
  const { offerings, isPremium, purchasePackage, restorePurchases } = useRevenueCat();
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual' | 'lifetime'>('monthly');
  const [isPurchasing, setIsPurchasing] = useState(false);

  const annualPackage = offerings?.find(pkg => pkg.packageType === PACKAGE_TYPE.ANNUAL);
  const monthlyPackage = offerings?.find(pkg => pkg.packageType === PACKAGE_TYPE.MONTHLY);
  const lifetimePackage = offerings?.find(pkg => pkg.packageType === PACKAGE_TYPE.LIFETIME);

  const fallbackPrices = {
    monthly: "$19.900",
    annual: "$139.900",
    lifetime: "$249.900"
  };

  const benefits = [
    { icon: "shield_moon", titleKey: "benefit1Title", descKey: "benefit1Desc" },
    { icon: "psychology", titleKey: "benefit2Title", descKey: "benefit2Desc" },
    { icon: "map", titleKey: "benefit3Title", descKey: "benefit3Desc" },
    { icon: "sell", titleKey: "benefit4Title", descKey: "benefit4Desc" },
    { icon: "download", titleKey: "benefit5Title", descKey: "benefit5Desc" },
    { icon: "support_agent", titleKey: "benefit6Title", descKey: "benefit6Desc" },
    { icon: "folder_managed", titleKey: "benefit7Title", descKey: "benefit7Desc" }
  ];

  const handleSubscribe = async () => {
    if (isPremium || isPurchasing) return;

    let pkgToPurchase;
    if (selectedPlan === 'annual') pkgToPurchase = annualPackage;
    else if (selectedPlan === 'monthly') pkgToPurchase = monthlyPackage;
    else pkgToPurchase = lifetimePackage;

    if (!pkgToPurchase) {
      console.error("RevenueCat: Package not found for selection", selectedPlan);
      alert(t('premium.packageUnavailable'));
      return;
    }

    setIsPurchasing(true);
    const success = await purchasePackage(pkgToPurchase);
    setIsPurchasing(false);

    if (!success) {
      // Small feedback for error if not cancelled
      console.log("Purchase was not successful or was cancelled.");
    }
  };

  // Variants for staggered children
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100
      }
    }
  };

  return (
    <div className="bg-background-light dark:bg-premium-bg-dark font-display text-premium-secondary dark:text-content antialiased h-screen w-full flex flex-col z-50 fixed inset-0 overflow-hidden">

      {/* Scrollable Container */}
      <div className="flex-1 overflow-y-auto no-scrollbar relative w-full">

        {/* Header Button (Absolute) */}
        <button
          onClick={onMenuClick}
          className="fixed top-safe left-4 z-50 flex items-center justify-center size-10 rounded-full text-white bg-black/25 backdrop-blur-md border border-white/10 hover:bg-black/40 shadow-lg transition-all active:scale-95"
        >
          <span className="material-symbols-outlined text-2xl">menu</span>
        </button>

        {/* Hero Section */}
        <div className="relative h-[45vh] min-h-[380px] w-full overflow-hidden rounded-b-[40px] shadow-2xl shadow-premium-secondary/20 shrink-0">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuD7EvBKtlXwZblN2Llz5bQ0mQ-m5T0fUqlEoi4bDgqErk2glkwPat8V5dTTCJHVPMUQeoHkJgAKW4CoRDl9wLaIYgN50goOdGOD7dKUGKOfA-isHxCizKHHYDT5Kyh9WdVxStuQ3mape3f5NUK6tCtjnN3RUejRXIJINGbyRhO-PpxXwj6jTP_ZEHWpX3EtZ9RQnsM1zPaaFNmHE6afQlHQpL-aO2Cdb8K4eYzheP_vF4eIMvgdHyx-x9qhsOVY-WE558bxSXmTiV-3")' }}
          ></div>
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-premium-bg-dark/20 to-premium-bg-dark/95 dark:to-premium-bg-dark"></div>

          <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center justify-end px-6 pb-10 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-orange-400 p-0.5 shadow-lg shadow-orange-500/30">
              <div className="px-4 py-1 bg-black/40 rounded-full backdrop-blur-md">
                <span className="text-xs font-black uppercase tracking-widest text-content flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px] filled-icon text-yellow-400">workspace_premium</span>
                  {t('premium.badge')}
                </span>
              </div>
            </div>
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-content drop-shadow-xl md:text-5xl">
              {t('premium.titleStart')} <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-300 to-primary">{t('premium.titleEnd')}</span>
            </h1>
            <p className="mt-4 text-base font-medium leading-relaxed text-content/90 max-w-xs mx-auto">
              {t('premium.desc')}
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-col px-5 pt-8 pb-40 gap-8">

          {/* Plans Section */}
          <div className="flex flex-col gap-4">
            <h2 className="px-1 text-sm font-bold uppercase tracking-wider text-premium-secondary/50 dark:text-content-subtle">{t('premium.planTitle')}</h2>

            {/* Monthly Plan */}
            <label
              className={`relative flex cursor-pointer items-center justify-between rounded-3xl border-2 p-5 transition-all duration-300 ${selectedPlan === 'monthly'
                ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-lg scale-[1.01]'
                : 'border-gray-200 bg-white dark:border-overlay/10 dark:bg-premium-surface-dark'
                }`}
            >
              <input
                type="radio"
                name="pricing"
                className="peer sr-only"
                checked={selectedPlan === 'monthly'}
                onChange={() => setSelectedPlan('monthly')}
              />
              <div className="flex flex-col gap-1">
                <span className="text-base font-bold text-premium-secondary dark:text-content">{t('premium.monthlyTitle')}</span>
                <span className="text-xs text-premium-secondary/50 dark:text-content-muted">{t('premium.monthlyFlex')}</span>
              </div>
              <div className="flex items-end gap-1">
                <span className="text-xl font-black tracking-tight text-premium-secondary dark:text-content">
                  {monthlyPackage?.product.priceString || fallbackPrices.monthly}
                </span>
                <span className="mb-1 text-xs font-bold text-premium-secondary/50 dark:text-content-muted">{t('premium.monthlyPeriod')}</span>
              </div>
            </label>

            {/* Annual Plan (Featured) */}
            <label
              className={`relative flex cursor-pointer flex-col gap-3 rounded-3xl border-2 p-5 transition-all duration-300 ${selectedPlan === 'annual'
                ? 'border-primary bg-gradient-to-br from-primary/10 to-transparent dark:from-primary/20 shadow-xl shadow-primary/10 scale-[1.02]'
                : 'border-gray-200 bg-white dark:border-overlay/10 dark:bg-premium-surface-dark'
                }`}
            >
              <input
                type="radio"
                name="pricing"
                className="peer sr-only"
                checked={selectedPlan === 'annual'}
                onChange={() => setSelectedPlan('annual')}
              />
              <div className="absolute -top-3 left-6 rounded-full bg-gradient-to-r from-primary to-orange-500 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-content shadow-lg shadow-orange-500/40">
                {t('premium.annualBenefit')}
              </div>
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-lg font-bold text-premium-secondary dark:text-content">{t('premium.annualTitle')}</span>
                  <span className="text-xs font-bold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-md w-fit mt-1">{t('premium.annualSave')}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-3xl font-black tracking-tight text-premium-secondary dark:text-content">
                    {annualPackage?.product.priceString || fallbackPrices.annual}
                  </span>
                  <span className="text-xs font-bold text-premium-secondary/50 dark:text-content-muted">{t('premium.annualPeriod')}</span>
                </div>
              </div>

              {selectedPlan === 'annual' && (
                <div className="absolute right-5 top-5 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white shadow-md animate-bounce-subtle">
                  <span className="material-symbols-outlined text-[16px] font-bold">check</span>
                </div>
              )}
            </label>

            {/* Lifetime Plan */}
            <label
              className={`relative flex cursor-pointer flex-col gap-3 rounded-3xl border-2 p-5 transition-all duration-300 ${selectedPlan === 'lifetime'
                ? 'border-yellow-500 bg-gradient-to-br from-yellow-500/10 to-transparent shadow-xl shadow-yellow-500/10 scale-[1.02]'
                : 'border-gray-200 bg-white dark:border-overlay/10 dark:bg-premium-surface-dark'
                }`}
            >
              <input
                type="radio"
                name="pricing"
                className="peer sr-only"
                checked={selectedPlan === 'lifetime'}
                onChange={() => setSelectedPlan('lifetime')}
              />
              <div className="absolute -top-3 left-6 rounded-full bg-gradient-to-r from-yellow-500 to-amber-600 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-content shadow-lg shadow-yellow-500/40">
                {t('premium.lifetimeBenefit')}
              </div>
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-lg font-bold text-premium-secondary dark:text-content">{t('premium.lifetimeTitle')}</span>
                  <span className="text-xs font-bold text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 px-2 py-0.5 rounded-md w-fit mt-1">{t('premium.lifetimePeriod')}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-3xl font-black tracking-tight text-premium-secondary dark:text-content">
                    {lifetimePackage?.product.priceString || fallbackPrices.lifetime}
                  </span>
                  <span className="text-xs font-bold text-premium-secondary/50 dark:text-content-muted">{t('premium.once')}</span>
                </div>
              </div>

              {selectedPlan === 'lifetime' && (
                <div className="absolute right-5 top-5 flex h-6 w-6 items-center justify-center rounded-full bg-yellow-500 text-content shadow-md animate-bounce-subtle">
                  <span className="material-symbols-outlined text-[16px] font-bold">check</span>
                </div>
              )}

              {/* Urgency Counter */}
              <div className="mt-2 flex items-center justify-center gap-1.5 py-1 px-3 bg-yellow-500/10 rounded-full border border-yellow-500/20">
                <span className="flex h-1.5 w-1.5 rounded-full bg-yellow-500 animate-pulse"></span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-yellow-600 dark:text-yellow-400">
                  {t('premium.lifetimeUsers')}
                </span>
              </div>
            </label>
          </div>

          <div className="h-px w-full bg-gray-100 dark:bg-overlay/5"></div>

          {/* Benefits Section (Redesigned) */}
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-primary/60">{t('premium.benefitsTitle')}</h2>
              <div className="h-px flex-1 bg-overlay/5 ml-4"></div>
            </div>

            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="flex flex-col gap-3"
            >
              {benefits.map((benefit, index) => (
                <motion.div
                  key={index}
                  variants={itemVariants}
                  className="group relative flex items-start gap-4 p-5 rounded-3xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.05] hover:border-primary/30 transition-all duration-500 overflow-hidden"
                >
                  {/* Decorative faint glow */}
                  <div className="absolute -right-4 -top-4 w-16 h-16 bg-primary/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>

                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-primary shadow-lg shadow-primary/5 group-hover:bg-primary group-hover:text-black transition-all duration-500">
                    <span className="material-symbols-outlined text-2xl">{benefit.icon}</span>
                  </div>

                  <div className="flex flex-col gap-1.5 pt-0.5">
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
          </div>

          <div className="h-px w-full bg-gray-100 dark:bg-overlay/5"></div>


          {/* Secure Badge */}
          <div className="flex justify-center items-center gap-2 text-xs text-content-muted opacity-60">
            <span className="material-symbols-outlined text-[14px]">lock</span>
            {t('premium.secure')}
          </div>

        </div>
      </div>

      {/* Fixed Floating Footer Area */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-6 bg-gradient-to-t from-background-dark via-background-dark/98 to-transparent backdrop-blur-sm pt-14 pb-safe">
        <div className="flex flex-col gap-3 max-w-md mx-auto">
          {isPremium ? (
            <div className="w-full h-14 rounded-2xl bg-green-500/10 border border-green-500/30 flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-green-500 filled-icon">verified</span>
              <span className="text-lg font-bold text-green-500 tracking-wide">{t('premium.activeMembership')}</span>
            </div>
          ) : (
            <button
              onClick={handleSubscribe}
              disabled={isPurchasing}
              className="group relative w-full h-14 overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-orange-600 shadow-xl shadow-primary/30 active:scale-[0.98] transition-all disabled:opacity-70"
            >
              <div className="absolute inset-0 bg-overlay/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
              <div className="relative flex items-center justify-center gap-3 h-full">
                <span className="text-lg font-bold text-content tracking-wide">
                  {isPurchasing ? t('premium.processing') : t('premium.subscribe')}
                </span>
                {!isPurchasing && <span className="material-symbols-outlined text-content text-[22px] group-hover:translate-x-1 transition-transform">rocket_launch</span>}
                {isPurchasing && <span className="material-symbols-outlined text-content text-[22px] animate-spin">progress_activity</span>}
              </div>
            </button>
          )}
          <div className="flex flex-col items-center gap-1">
            <p className="text-center text-[11px] font-medium text-premium-secondary/60 dark:text-content-muted">
              {isPremium ? t('premium.thankYouVip') : t('premium.subscribeSub')}
            </p>
            {!isPremium && (
              <button
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