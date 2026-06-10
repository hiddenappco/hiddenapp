import React from 'react';
import { Language } from '../types/core';
import { useTranslation } from '../hooks/useTranslation';
import { useUserProfile, updateNotificationPrefs } from '../hooks/useFirestore';
import { useAuth } from './layout/AuthProvider';

interface NotificationSettingsProps {
  language: Language;
  onBack: () => void;
}

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({ onBack }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: profile } = useUserProfile(user?.uid);

  // Default switches based on profile or fallback
  const currentPrefs = profile?.notificationPrefs || {
    ferias: true,
    paraisos: true,
    cupones: false,
    seguridad: true,
    vias: true,
    support: true
  };

  const handleToggle = async (key: string) => {
    if (!user) return;
    const newPrefs = { ...currentPrefs, [key]: !(currentPrefs as any)[key] };
    try {
      await updateNotificationPrefs(user.uid, newPrefs);
    } catch (err) {
      console.error("Error updating settings:", err);
    }
  };

  return (
    <div className="bg-background-dark text-content font-display antialiased h-screen w-full flex flex-col overflow-hidden relative z-50">
      {/* Top App Bar */}
      <header className="sticky top-0 z-50 flex items-center bg-background-dark/95 backdrop-blur-md px-4 pb-2 pt-safe justify-between border-b border-overlay/5 transition-colors">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="text-content flex size-10 shrink-0 items-center justify-center cursor-pointer transition-opacity hover:opacity-70"
          >
            <span className="material-symbols-outlined text-2xl">arrow_back</span>
          </button>
          <h2 className="text-content text-lg font-bold leading-tight tracking-[-0.015em]">
            {t('notifications.title')}
          </h2>
        </div>
        <img src="/assets/ui/logo.png" alt="Hidden Logo" className="h-8 object-contain" />
      </header>

      {/* Scrollable Content */}
      <main className="flex-1 overflow-y-auto no-scrollbar pb-24">
        {/* Headline & Intro */}
        <div className="px-4 pt-6 pb-2">
          <h1 className="text-content tracking-tight text-[28px] font-bold leading-tight text-left mb-2">
            {t('notifications.headline')}
          </h1>
          <p className="text-content-muted text-base font-normal leading-relaxed">
            {t('notifications.subheadline')}
          </p>
        </div>

        {/* Section 1: Discovery (Orange/Sunset Theme) */}
        <div className="mt-6">
          <h3 className="text-secondary dark:text-gray-200 text-sm font-bold uppercase tracking-wider px-4 pb-3">
            {t('notifications.sectionDiscovery')}
          </h3>

          {/* Item: Ferias */}
          <div
            onClick={() => handleToggle('ferias')}
            className="flex items-center gap-4 px-4 py-3 justify-between hover:bg-overlay/5 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-4 flex-1">
              <div className="flex items-center justify-center rounded-2xl bg-orange-50 dark:bg-orange-900/20 text-primary shrink-0 size-12 shadow-sm">
                <span className="material-symbols-outlined">celebration</span>
              </div>
              <div className="flex flex-col justify-center pr-2">
                <p className="text-content text-base font-semibold leading-tight mb-1">{t('notifications.feriasTitle')}</p>
                <p className="text-content-muted text-sm font-normal leading-snug line-clamp-2">
                  {t('notifications.feriasDesc')}
                </p>
              </div>
            </div>
            <div className="shrink-0 pointer-events-none">
              <div className={`relative w-11 h-6 rounded-full transition-colors duration-200 ease-in-out ${currentPrefs.ferias ? 'bg-primary' : 'bg-gray-700'}`}>
                <div className={`absolute top-[2px] left-[2px] bg-white w-5 h-5 rounded-full shadow-sm transition-transform duration-200 ease-in-out ${currentPrefs.ferias ? 'translate-x-full' : 'translate-x-0'}`}></div>
              </div>
            </div>
          </div>

          {/* Item: Paraisos */}
          <div
            onClick={() => handleToggle('paraisos')}
            className="flex items-center gap-4 px-4 py-3 justify-between hover:bg-gray-50 dark:hover:bg-overlay/5 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-4 flex-1">
              <div className="flex items-center justify-center rounded-2xl bg-orange-50 dark:bg-orange-900/20 text-primary shrink-0 size-12 shadow-sm">
                <span className="material-symbols-outlined">landscape</span>
              </div>
              <div className="flex flex-col justify-center pr-2">
                <p className="text-secondary dark:text-content text-base font-semibold leading-tight mb-1">{t('notifications.paraisosTitle')}</p>
                <p className="text-content-subtle dark:text-content-muted text-sm font-normal leading-snug line-clamp-2">
                  {t('notifications.paraisosDesc')}
                </p>
              </div>
            </div>
            <div className="shrink-0 pointer-events-none">
              <div className={`relative w-11 h-6 rounded-full transition-colors duration-200 ease-in-out ${currentPrefs.paraisos ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'}`}>
                <div className={`absolute top-[2px] left-[2px] bg-white w-5 h-5 rounded-full shadow-sm transition-transform duration-200 ease-in-out ${currentPrefs.paraisos ? 'translate-x-full' : 'translate-x-0'}`}></div>
              </div>
            </div>
          </div>

          {/* Item: Noticias */}
          <div
            onClick={() => handleToggle('noticias')}
            className="flex items-center gap-4 px-4 py-3 justify-between hover:bg-gray-50 dark:hover:bg-overlay/5 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-4 flex-1">
              <div className="flex items-center justify-center rounded-2xl bg-orange-50 dark:bg-orange-900/20 text-primary shrink-0 size-12 shadow-sm">
                <span className="material-symbols-outlined">newspaper</span>
              </div>
              <div className="flex flex-col justify-center pr-2">
                <p className="text-secondary dark:text-content text-base font-semibold leading-tight mb-1">{t('notifications.noticiasTitle')}</p>
                <p className="text-content-subtle dark:text-content-muted text-sm font-normal leading-snug line-clamp-2">
                  {t('notifications.noticiasDesc')}
                </p>
              </div>
            </div>
            <div className="shrink-0 pointer-events-none">
              <div className={`relative w-11 h-6 rounded-full transition-colors duration-200 ease-in-out ${currentPrefs.noticias ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'}`}>
                <div className={`absolute top-[2px] left-[2px] bg-white w-5 h-5 rounded-full shadow-sm transition-transform duration-200 ease-in-out ${currentPrefs.noticias ? 'translate-x-full' : 'translate-x-0'}`}></div>
              </div>
            </div>
          </div>

          {/* Item: Asistente */}
          <div
            onClick={() => handleToggle('itinerarios')}
            className="flex items-center gap-4 px-4 py-3 justify-between hover:bg-gray-50 dark:hover:bg-overlay/5 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-4 flex-1">
              <div className="flex items-center justify-center rounded-2xl bg-orange-50 dark:bg-orange-900/20 text-primary shrink-0 size-12 shadow-sm">
                <span className="material-symbols-outlined">smart_toy</span>
              </div>
              <div className="flex flex-col justify-center pr-2">
                <p className="text-secondary dark:text-content text-base font-semibold leading-tight mb-1">{t('notifications.assistantTitle')}</p>
                <p className="text-content-subtle dark:text-content-muted text-sm font-normal leading-snug line-clamp-2">
                  {t('notifications.assistantDesc')}
                </p>
              </div>
            </div>
            <div className="shrink-0 pointer-events-none">
              <div className={`relative w-11 h-6 rounded-full transition-colors duration-200 ease-in-out ${currentPrefs.itinerarios ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'}`}>
                <div className={`absolute top-[2px] left-[2px] bg-white w-5 h-5 rounded-full shadow-sm transition-transform duration-200 ease-in-out ${currentPrefs.itinerarios ? 'translate-x-full' : 'translate-x-0'}`}></div>
              </div>
            </div>
          </div>
        </div>

        <div className="h-px bg-gray-100 dark:bg-gray-800 mx-4 my-2"></div>

        {/* Section 2: Savings (Deep Blue Theme) */}
        <div className="mt-4">
          <h3 className="text-secondary dark:text-gray-200 text-sm font-bold uppercase tracking-wider px-4 pb-3">
            {t('notifications.sectionSavings')}
          </h3>

          {/* Item: Cupones */}
          <div
            onClick={() => handleToggle('cupones')}
            className="flex items-center gap-4 px-4 py-3 justify-between hover:bg-gray-50 dark:hover:bg-overlay/5 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-4 flex-1">
              <div className="flex items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-800 text-secondary dark:text-blue-300 shrink-0 size-12 shadow-sm">
                <span className="material-symbols-outlined">savings</span>
              </div>
              <div className="flex flex-col justify-center pr-2">
                <p className="text-secondary dark:text-content text-base font-semibold leading-tight mb-1">{t('notifications.cuponesTitle')}</p>
                <p className="text-content-subtle dark:text-content-muted text-sm font-normal leading-snug line-clamp-2">
                  {t('notifications.cuponesDesc')}
                </p>
              </div>
            </div>
            <div className="shrink-0 pointer-events-none">
              <div className={`relative w-11 h-6 rounded-full transition-colors duration-200 ease-in-out ${currentPrefs.cupones ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'}`}>
                <div className={`absolute top-[2px] left-[2px] bg-white w-5 h-5 rounded-full shadow-sm transition-transform duration-200 ease-in-out ${currentPrefs.cupones ? 'translate-x-full' : 'translate-x-0'}`}></div>
              </div>
            </div>
          </div>

          {/* Item: Ofertas */}
          <div
            onClick={() => handleToggle('ofertas')}
            className="flex items-center gap-4 px-4 py-3 justify-between hover:bg-gray-50 dark:hover:bg-overlay/5 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-4 flex-1">
              <div className="flex items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-800 text-secondary dark:text-blue-300 shrink-0 size-12 shadow-sm">
                <span className="material-symbols-outlined">confirmation_number</span>
              </div>
              <div className="flex flex-col justify-center pr-2">
                <p className="text-secondary dark:text-content text-base font-semibold leading-tight mb-1">{t('notifications.ofertasTitle')}</p>
                <p className="text-content-subtle dark:text-content-muted text-sm font-normal leading-snug line-clamp-2">
                  {t('notifications.ofertasDesc')}
                </p>
              </div>
            </div>
            <div className="shrink-0 pointer-events-none">
              <div className={`relative w-11 h-6 rounded-full transition-colors duration-200 ease-in-out ${currentPrefs.ofertas ? 'bg-primary' : 'bg-gray-700'}`}>
                <div className={`absolute top-[2px] left-[2px] bg-white w-5 h-5 rounded-full shadow-sm transition-transform duration-200 ease-in-out ${currentPrefs.ofertas ? 'translate-x-full' : 'translate-x-0'}`}></div>
              </div>
            </div>
          </div>
        </div>

        <div className="h-px bg-gray-100 dark:bg-gray-800 mx-4 my-2"></div>

        {/* Section 3: Safety (Green Theme) */}
        <div className="mt-4">
          <h3 className="text-secondary dark:text-gray-200 text-sm font-bold uppercase tracking-wider px-4 pb-3">
            {t('notifications.sectionSafety')}
          </h3>

          {/* Item: Seguridad */}
          <div
            onClick={() => handleToggle('seguridad')}
            className="flex items-center gap-4 px-4 py-3 justify-between hover:bg-gray-50 dark:hover:bg-overlay/5 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-4 flex-1">
              <div className="flex items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 text-accent dark:text-emerald-400 shrink-0 size-12 shadow-sm">
                <span className="material-symbols-outlined">health_and_safety</span>
              </div>
              <div className="flex flex-col justify-center pr-2">
                <p className="text-secondary dark:text-content text-base font-semibold leading-tight mb-1">{t('notifications.seguridadTitle')}</p>
                <p className="text-content-subtle dark:text-content-muted text-sm font-normal leading-snug line-clamp-2">
                  {t('notifications.seguridadDesc')}
                </p>
              </div>
            </div>
            <div className="shrink-0 pointer-events-none">
              <div className={`relative w-11 h-6 rounded-full transition-colors duration-200 ease-in-out ${currentPrefs.seguridad ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'}`}>
                <div className={`absolute top-[2px] left-[2px] bg-white w-5 h-5 rounded-full shadow-sm transition-transform duration-200 ease-in-out ${currentPrefs.seguridad ? 'translate-x-full' : 'translate-x-0'}`}></div>
              </div>
            </div>
          </div>

          {/* Item: Vias */}
          <div
            onClick={() => handleToggle('vias')}
            className="flex items-center gap-4 px-4 py-3 justify-between hover:bg-gray-50 dark:hover:bg-overlay/5 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-4 flex-1">
              <div className="flex items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 text-accent dark:text-emerald-400 shrink-0 size-12 shadow-sm">
                <span className="material-symbols-outlined">traffic</span>
              </div>
              <div className="flex flex-col justify-center pr-2">
                <p className="text-secondary dark:text-content text-base font-semibold leading-tight mb-1">{t('notifications.viasTitle')}</p>
                <p className="text-content-subtle dark:text-content-muted text-sm font-normal leading-snug line-clamp-2">
                  {t('notifications.viasDesc')}
                </p>
              </div>
            </div>
            <div className="shrink-0 pointer-events-none">
              <div className={`relative w-11 h-6 rounded-full transition-colors duration-200 ease-in-out ${currentPrefs.vias ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'}`}>
                <div className={`absolute top-[2px] left-[2px] bg-white w-5 h-5 rounded-full shadow-sm transition-transform duration-200 ease-in-out ${currentPrefs.vias ? 'translate-x-full' : 'translate-x-0'}`}></div>
              </div>
            </div>
          </div>
        </div>

        <div className="h-px bg-gray-100 dark:bg-gray-800 mx-4 my-2"></div>

        {/* Section 4: Account (Gray Theme) */}
        <div className="mt-4">
          <h3 className="text-secondary dark:text-gray-200 text-sm font-bold uppercase tracking-wider px-4 pb-3">
            {t('notifications.sectionAccount')}
          </h3>

          {/* Item: Soporte */}
          <div
            onClick={() => handleToggle('support')}
            className="flex items-center gap-4 px-4 py-3 justify-between hover:bg-gray-50 dark:hover:bg-overlay/5 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-4 flex-1">
              <div className="flex items-center justify-center rounded-2xl bg-gray-100 dark:bg-overlay/10 text-secondary dark:text-content shrink-0 size-12 shadow-sm">
                <span className="material-symbols-outlined">support_agent</span>
              </div>
              <div className="flex flex-col justify-center pr-2">
                <p className="text-secondary dark:text-content text-base font-semibold leading-tight mb-1">{t('notifications.supportTitle')}</p>
                <p className="text-content-subtle dark:text-content-muted text-sm font-normal leading-snug line-clamp-2">
                  {t('notifications.supportDesc')}
                </p>
              </div>
            </div>
            <div className="shrink-0 pointer-events-none">
              <div className={`relative w-11 h-6 rounded-full transition-colors duration-200 ease-in-out ${currentPrefs.support ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'}`}>
                <div className={`absolute top-[2px] left-[2px] bg-white w-5 h-5 rounded-full shadow-sm transition-transform duration-200 ease-in-out ${currentPrefs.support ? 'translate-x-full' : 'translate-x-0'}`}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-6 px-6 text-center">
          <p className="text-xs text-content-subtle">
            <span className="material-symbols-outlined align-middle text-sm mr-1">wifi_off</span>
            {t('notifications.footer')}
          </p>
          <button className="mt-4 text-primary text-sm font-medium hover:underline">
            {t('notifications.permissions')}
          </button>
        </div>
      </main>
    </div>
  );
};
