import React from 'react';
import { useTranslation } from '../hooks/useTranslation';

interface OffGridManualProps {
  onBack: () => void;
}

const ManualCard: React.FC<{
  icon: string;
  label?: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}> = ({ icon, label, title, subtitle, children }) => (
  <section className="relative overflow-hidden rounded-[30px] bg-surface-dark dark:bg-gradient-to-br dark:from-[#0a1f35] dark:to-[#12385c] p-6 border border-overlay/10 shadow-lg dark:shadow-black/30">
    <div className="flex items-center gap-2 mb-4">
      <div className="size-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
        <span className="material-symbols-outlined text-emerald-400 text-base">{icon}</span>
      </div>
      <div>
        {label && (
          <p className="text-content/40 text-[9px] font-bold uppercase tracking-widest">{label}</p>
        )}
        <h3 className="text-sm font-black text-content">{title}</h3>
      </div>
    </div>
    {subtitle && (
      <p className="text-[10px] text-emerald-400/80 font-bold uppercase tracking-widest mb-3">{subtitle}</p>
    )}
    {children}
  </section>
);

const InfoBlock: React.FC<{ icon: string; title: string; body: string }> = ({ icon, title, body }) => (
  <div className="p-4 rounded-2xl bg-overlay/5 dark:bg-black/20 border border-overlay/5">
    <div className="flex items-center gap-2 mb-2">
      <span className="material-symbols-outlined text-emerald-400 text-sm">{icon}</span>
      <p className="text-xs font-bold text-content">{title}</p>
    </div>
    <p className="text-xs text-content/60 leading-relaxed">{body}</p>
  </div>
);

export const OffGridManual: React.FC<OffGridManualProps> = ({ onBack }) => {
  const { t } = useTranslation();

  const offlineSteps = [
    t('vault.manual.offlineStep1'),
    t('vault.manual.offlineStep2'),
    t('vault.manual.offlineStep3'),
    t('vault.manual.offlineStep4'),
  ];

  const checklist = [
    t('vault.manual.checklist1'),
    t('vault.manual.checklist2'),
    t('vault.manual.checklist3'),
    t('vault.manual.checklist4'),
  ];

  return (
    <div className="bg-background-dark font-display text-content antialiased h-full w-full flex flex-col overflow-y-auto no-scrollbar relative selection:bg-primary selection:text-white">

      <header className="sticky top-0 z-50 flex items-center gap-3 bg-background-dark/90 dark:bg-[#05111e]/90 backdrop-blur-md px-4 pb-2 pt-safe border-b border-overlay/5 shrink-0">
        <button
          onClick={onBack}
          className="flex items-center justify-center size-10 rounded-full text-white bg-[#0f2c4c] hover:bg-[#0a1f35] shadow-lg border border-overlay/10 transition-colors shrink-0"
          aria-label="Back"
        >
          <span className="material-symbols-outlined text-[22px]">arrow_back</span>
        </button>
        <h2 className="flex-1 min-w-0 text-base font-bold leading-tight tracking-tight text-content truncate">
          {t('vault.manualTitle')}
        </h2>
      </header>

      <main className="p-5 flex flex-col gap-6 pb-[calc(4rem+env(safe-area-inset-bottom,1.5rem))]">

        <section className="relative overflow-hidden rounded-[30px] bg-surface-dark dark:bg-gradient-to-br dark:from-[#0a1f35] dark:to-[#12385c] p-6 border border-overlay/10 shadow-lg dark:shadow-black/30 text-center">
          <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, rgba(16,185,129,0.5) 1px, transparent 1px)', backgroundSize: '18px 18px' }} />
          <span className="material-symbols-outlined text-emerald-400 text-5xl mb-3 block drop-shadow-lg">menu_book</span>
          <h1 className="text-xl font-black tracking-tight text-content mb-2">{t('vault.manualTitle')}</h1>
          <p className="text-xs text-content/60 leading-relaxed max-w-[340px] mx-auto">{t('vault.manual.subtitle')}</p>
        </section>

        <ManualCard icon="explore" title={t('vault.manual.introTitle')}>
          <p className="text-xs text-content/70 leading-relaxed">{t('vault.manual.introBody')}</p>
        </ManualCard>

        <ManualCard icon="layers" title={t('vault.manual.dualModesTitle')}>
          <p className="text-xs text-content/70 leading-relaxed">{t('vault.manual.dualModesBody')}</p>
        </ManualCard>

        <ManualCard
          icon="signal_wifi_off"
          label={t('vault.manual.offlineAccessLabel')}
          title={t('vault.manual.offlineAccessTitle')}
        >
          <p className="text-xs text-content/70 leading-relaxed mb-4">{t('vault.manual.offlineAccessBody')}</p>
          <ol className="flex flex-col gap-3">
            {offlineSteps.map((step, i) => (
              <li key={i} className="flex gap-3 text-xs text-content/60 leading-relaxed">
                <span className="size-6 shrink-0 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[10px] font-black text-emerald-400">
                  {i + 1}
                </span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </ManualCard>

        <ManualCard icon="pie_chart" title={t('vault.manual.storageTitle')}>
          <p className="text-xs text-content/70 leading-relaxed">{t('vault.manual.storageBody')}</p>
        </ManualCard>

        <ManualCard
          icon="folder_zip"
          label={t('vault.manual.step1Label')}
          title={t('vault.manual.step1Title')}
          subtitle={t('vault.manual.step1Subtitle')}
        >
          <div className="flex flex-col gap-4">
            <InfoBlock icon="inventory_2" title={t('vault.manual.step1WhatTitle')} body={t('vault.manual.step1WhatBody')} />
            <InfoBlock icon="download" title={t('vault.manual.step1HowTitle')} body={t('vault.manual.step1HowBody')} />
            <InfoBlock icon="update" title={t('vault.manual.step1UpdateTitle')} body={t('vault.manual.step1UpdateBody')} />
            <InfoBlock icon="delete_sweep" title={t('vault.manual.step1DeleteTitle')} body={t('vault.manual.step1DeleteBody')} />
          </div>
        </ManualCard>

        <ManualCard
          icon="search"
          label={t('vault.manual.step2Label')}
          title={t('vault.manual.step2Title')}
          subtitle={t('vault.manual.step2Subtitle')}
        >
          <div className="flex flex-col gap-4">
            <InfoBlock icon="travel_explore" title={t('vault.manual.step2WhatTitle')} body={t('vault.manual.step2WhatBody')} />
            <InfoBlock icon="touch_app" title={t('vault.manual.step2HowTitle')} body={t('vault.manual.step2HowBody')} />
          </div>
        </ManualCard>

        <ManualCard
          icon="chat"
          label={t('vault.manual.step3Label')}
          title={t('vault.manual.step3Title')}
          subtitle={t('vault.manual.step3Subtitle')}
        >
          <div className="flex flex-col gap-4">
            <InfoBlock icon="forum" title={t('vault.manual.step3WhatTitle')} body={t('vault.manual.step3WhatBody')} />
            <InfoBlock icon="open_in_new" title={t('vault.manual.step3HowTitle')} body={t('vault.manual.step3HowBody')} />
            <InfoBlock icon="bolt" title={t('vault.manual.step3ModeTitle')} body={t('vault.manual.step3ModeBody')} />
          </div>
        </ManualCard>

        <ManualCard
          icon="psychology"
          label={t('vault.manual.step4Label')}
          title={t('vault.manual.step4Title')}
          subtitle={t('vault.manual.step4Subtitle')}
        >
          <div className="flex flex-col gap-4">
            <InfoBlock icon="smart_toy" title={t('vault.manual.step4WhatTitle')} body={t('vault.manual.step4WhatBody')} />
            <InfoBlock icon="storage" title={t('vault.manual.step4StorageTitle')} body={t('vault.manual.step4StorageBody')} />
          </div>
        </ManualCard>

        <ManualCard
          icon="smartphone"
          label={t('vault.manual.techLabel')}
          title={t('vault.manual.techTitle')}
          subtitle={t('vault.manual.techSubtitle')}
        >
          <div className="flex flex-col gap-4">
            <InfoBlock icon="verified" title={t('vault.manual.techAllDevicesTitle')} body={t('vault.manual.techAllDevicesBody')} />
            <div className="p-4 rounded-2xl bg-overlay/5 dark:bg-black/20 border border-overlay/5">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 rounded-md bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 text-[8px] font-black uppercase tracking-wider">
                  {t('vault.manual.recommendedBadge')}
                </span>
                <p className="text-xs font-bold text-content">{t('vault.manual.smartGuideModeTitle')}</p>
              </div>
              <p className="text-xs text-content/60 leading-relaxed">{t('vault.manual.smartGuideModeBody')}</p>
            </div>
          </div>
        </ManualCard>

        <ManualCard icon="checklist" title={t('vault.manual.checklistTitle')}>
          <ul className="flex flex-col gap-2.5">
            {checklist.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-content/60">
                <span className="material-symbols-outlined text-emerald-400 text-sm shrink-0">check_circle</span>
                {item}
              </li>
            ))}
          </ul>
        </ManualCard>

        <section className="relative overflow-hidden rounded-[30px] bg-surface-dark dark:bg-gradient-to-br dark:from-[#0a1f35] dark:to-[#12385c] p-6 border border-overlay/10 shadow-lg dark:shadow-black/30 text-center">
          <span className="material-symbols-outlined text-emerald-400/30 text-4xl mb-3 block">tips_and_updates</span>
          <p className="text-xs text-content/50 leading-relaxed max-w-[320px] mx-auto">{t('vault.manual.proTip')}</p>
        </section>

      </main>
    </div>
  );
};
