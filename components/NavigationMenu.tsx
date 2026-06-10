import React from 'react';
import { Language } from '../types/core';
import { useTranslation } from '../hooks/useTranslation';
import { useAuth } from './layout/AuthProvider';
import { useNotifications, useSupportTickets, useUserProfile } from '../hooks/useFirestore';

interface NavigationMenuProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  onLogout: () => void;
  onHomeClick: () => void;
  onSearchClick: () => void;
  onNewsClick: () => void;
  onPerksClick: () => void;
  onSupportClick: () => void;
  onProfileClick: () => void;
  onPremiumClick: () => void;
  onBudgetClick: () => void;
  onSavedClick: () => void;
  onCalendarClick: () => void;
  onNotificationsClick: () => void;
  onPactClick: () => void;
  onMonitorClick?: () => void;
  onRefugiosClick: () => void;
  onOffGridClick: () => void;
}

export const NavigationMenu: React.FC<NavigationMenuProps> = ({
  isOpen,
  onClose,
  language,
  onLogout,
  onHomeClick,
  onSearchClick,
  onNewsClick,
  onPerksClick,
  onSupportClick,
  onProfileClick,
  onPremiumClick,
  onBudgetClick,
  onSavedClick,
  onCalendarClick,
  onNotificationsClick,
  onPactClick,
  onMonitorClick = () => { },
  onRefugiosClick,
  onOffGridClick
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: notifications } = useNotifications(user?.uid);
  const { data: supportTickets } = useSupportTickets(user?.uid);
  // Real-time profile data for instant avatar updates
  const { data: userProfile } = useUserProfile(user?.uid);

  const unreadCount = notifications.filter(n => !n.read).length;
  const supportUnreadCount = supportTickets.filter(t => t.hasUnreadMessages).length;

  const userName = userProfile?.displayName || user?.displayName || 'Hidden';
  const userPhoto = userProfile?.photoURL || user?.photoURL || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80";

  const texts = {
    greeting: t('menu.greeting', { name: userName }),
    menu: {
      home: t('menu.home'),
      explore: t('menu.explore'),
      environmentalMonitor: t('menu.environmentalMonitor'),
      profile: t('menu.profile'),
      news: t('menu.news'),
      coupons: t('menu.coupons'),
      calendar: t('menu.calendar'),
      budget: t('menu.budget'),
      refugios: t('menu.refugios'),
      offGridVault: t('menu.offGridVault'),
      support: t('menu.support'),
      pact: t('menu.pact')
    },
    premiumTitle: t('menu.premiumTitle'),
    premiumDesc: t('menu.premiumDesc'),
    premiumBtn: t('menu.premiumBtn'),
    logout: t('menu.logout'),
    version: "1.0.6"
  };

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-[60] h-full w-full overflow-hidden">
      {/* Background Overlay */}
      <div
        className="absolute inset-0 z-0 bg-black/50 backdrop-blur-sm cursor-pointer transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      ></div>

      <div className="absolute left-0 top-0 h-full w-full max-w-sm flex flex-col pointer-events-none">
        {/* Main Menu Container - Blue Theme */}
        <div className="relative pointer-events-auto flex h-full w-[85%] flex-col bg-white dark:bg-[#0f2c4c] shadow-2xl rounded-r-3xl animate-[slideInRight_0.3s_ease-out] overflow-hidden border-r border-overlay/10">

          {/* Header */}
          <div className="flex flex-col gap-4 p-6 pt-12 pb-4 bg-slate-50 dark:bg-[#0a1f35]">
            <div className="flex items-center justify-between">
              <div
                className="relative cursor-pointer"
                onClick={(e) => { e.preventDefault(); onProfileClick(); }}
              >
                <div className="h-16 w-16 rounded-full p-0.5 bg-gradient-to-tr from-primary to-transparent overflow-hidden">
                  <img
                    alt="Profile"
                    className="h-full w-full rounded-full object-cover border-2 border-white dark:border-[#0f2c4c]"
                    src={userPhoto}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={(e) => { e.preventDefault(); onNotificationsClick(); onClose(); }}
                  className="relative flex h-10 w-10 items-center justify-center rounded-full text-content/80 hover:bg-overlay/10 transition-colors"
                >
                  <span className="material-symbols-outlined">notifications</span>
                  {unreadCount > 0 && (
                    <span className="absolute top-2.5 right-3 h-2 w-2 rounded-full bg-primary border border-white dark:border-[#0f2c4c]"></span>
                  )}
                </button>
                <button
                  onClick={onClose}
                  className="flex h-10 w-10 items-center justify-center rounded-full text-content/80 hover:bg-overlay/10 transition-colors"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold leading-tight text-primary">{texts.greeting}</p>
            </div>
          </div>

          {/* Menu Items */}
          <div className="flex-1 overflow-y-auto px-4 py-4 no-scrollbar">
            <ul className="flex flex-col gap-1">

              {/* 1. Mapa (Home) */}
              <li>
                <button
                  onClick={() => { onHomeClick(); onClose(); }}
                  className="group flex w-full h-12 items-center gap-4 rounded-xl px-4 hover:bg-overlay/10 transition-colors text-left"
                >
                  <span className="material-symbols-outlined text-content/90 group-hover:text-primary transition-colors">map</span>
                  <p className="text-base font-medium text-content/90 group-hover:text-content">{texts.menu.home}</p>
                </button>
              </li>

              {/* 2. Explorar */}
              <li>
                <button
                  onClick={() => { onSearchClick(); onClose(); }}
                  className="group flex w-full h-12 items-center gap-4 rounded-xl px-4 hover:bg-overlay/10 transition-colors text-left"
                >
                  <span className="material-symbols-outlined text-content/90 group-hover:text-primary transition-colors">search</span>
                  <p className="text-base font-medium text-content/90 group-hover:text-content">{texts.menu.explore}</p>
                </button>
              </li>

              {/* Monitor Ambiental */}
              <li>
                <button
                  onClick={() => { onMonitorClick(); onClose(); }}
                  className="group flex w-full h-12 items-center gap-4 rounded-xl px-4 hover:bg-overlay/10 transition-colors text-left"
                >
                  <span className="material-symbols-outlined text-content/90 group-hover:text-primary transition-colors">radar</span>
                  <p className="text-base font-medium text-content/90 group-hover:text-content">{texts.menu.environmentalMonitor}</p>
                </button>
              </li>

              {/* 3. Perfil */}
              <li>
                <button
                  onClick={() => { onProfileClick(); onClose(); }}
                  className="group flex w-full h-12 items-center gap-4 rounded-xl px-4 hover:bg-overlay/10 transition-colors text-left"
                >
                  <span className="material-symbols-outlined text-content/90 group-hover:text-primary transition-colors">person</span>
                  <p className="text-base font-medium text-content/90 group-hover:text-content">{texts.menu.profile}</p>
                </button>
              </li>

              {/* 4. Bitácora de Gastos */}
              <li>
                <button
                  onClick={() => { onBudgetClick(); onClose(); }}
                  className="group flex w-full h-12 items-center gap-4 rounded-xl px-4 hover:bg-overlay/10 transition-colors text-left"
                >
                  <span className="material-symbols-outlined text-content/90 group-hover:text-primary transition-colors">account_balance_wallet</span>
                  <p className="text-base font-medium text-content/90 group-hover:text-content">{texts.menu.budget}</p>
                </button>
              </li>

              {/* Refugios Hidden */}
              <li>
                <button
                  onClick={() => { onRefugiosClick(); onClose(); }}
                  className="group flex w-full h-12 items-center gap-4 rounded-xl px-4 hover:bg-overlay/10 transition-colors text-left"
                >
                  <span className="material-symbols-outlined text-content/90 group-hover:text-primary transition-colors">home_work</span>
                  <p className="text-base font-medium text-content/90 group-hover:text-content">{texts.menu.refugios}</p>
                </button>
              </li>

              {/* Bóveda Off-Grid */}
              <li>
                <button
                  onClick={() => { onOffGridClick(); onClose(); }}
                  className="group flex w-full h-12 items-center gap-4 rounded-xl px-4 hover:bg-overlay/10 transition-colors text-left"
                >
                  <span className="material-symbols-outlined text-content/90 group-hover:text-primary transition-colors">radar</span>
                  <p className="text-base font-medium text-content/90 group-hover:text-content">{texts.menu.offGridVault}</p>
                </button>
              </li>

              <div className="my-2 h-px bg-overlay/10 mx-4"></div>

              {/* 5. Noticias */}
              <li>
                <button
                  onClick={() => { onNewsClick(); onClose(); }}
                  className="group flex w-full h-12 items-center gap-4 rounded-xl px-4 hover:bg-overlay/10 transition-colors text-left"
                >
                  <span className="material-symbols-outlined text-content/90 group-hover:text-primary transition-colors">newspaper</span>
                  <p className="text-base font-medium text-content/90 group-hover:text-content">{texts.menu.news}</p>
                </button>
              </li>

              {/* 6. Cupones */}
              <li>
                <button
                  onClick={() => { onPerksClick(); onClose(); }}
                  className="group flex w-full h-12 items-center gap-4 rounded-xl px-4 hover:bg-overlay/10 transition-colors text-left"
                >
                  <span className="material-symbols-outlined text-content/90 group-hover:text-primary transition-colors">loyalty</span>
                  <div className="flex flex-1 items-center justify-between">
                    <p className="text-base font-medium text-content/90 group-hover:text-content">{texts.menu.coupons}</p>
                  </div>
                </button>
              </li>

              {/* 7. Calendario */}
              <li>
                <button
                  onClick={() => { onCalendarClick(); onClose(); }}
                  className="group flex w-full h-12 items-center gap-4 rounded-xl px-4 hover:bg-overlay/10 transition-colors text-left"
                >
                  <span className="material-symbols-outlined text-content/90 group-hover:text-primary transition-colors">calendar_month</span>
                  <p className="text-base font-medium text-content/90 group-hover:text-content">{texts.menu.calendar}</p>
                </button>
              </li>

              {/* 8. Soporte */}
              <li>
                <button
                  onClick={() => { onSupportClick(); onClose(); }}
                  className="group flex w-full h-12 items-center gap-4 rounded-xl px-4 hover:bg-overlay/10 transition-colors text-left"
                >
                  <span className="material-symbols-outlined text-content/90 group-hover:text-primary transition-colors">support_agent</span>
                  <div className="flex flex-1 items-center justify-between">
                    <p className="text-base font-medium text-content/90 group-hover:text-content">{texts.menu.support}</p>
                    {supportUnreadCount > 0 && (
                      <span className="flex size-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm animate-in zoom-in spin-in-12">
                        {supportUnreadCount}
                      </span>
                    )}
                  </div>
                </button>
              </li>

            </ul>
          </div>

          {/* Bottom Section */}
          <div className="p-4 pb-8 bg-slate-50 dark:bg-[#0a1f35] border-t border-overlay/5 flex flex-col gap-3">

            {/* Pacto Hidden Button */}
            <button
              onClick={() => { onPactClick(); onClose(); }}
              className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-emerald-900 to-emerald-800 border border-emerald-700/50 shadow-lg group hover:brightness-110 transition-all"
            >
              <div className="size-10 rounded-full bg-emerald-950 flex items-center justify-center text-emerald-400 group-hover:text-white transition-colors shrink-0">
                <span className="material-symbols-outlined text-[20px]">fingerprint</span>
              </div>
              <div className="flex flex-col items-start overflow-hidden">
                <span className="text-sm font-bold text-emerald-100 truncate w-full text-left">{texts.menu.pact}</span>
                <span className="text-[10px] text-emerald-300/80 font-medium truncate w-full text-left">Manifiesto del viajero</span>
              </div>
            </button>

            {/* Premium Button Restored */}
            <button
              onClick={() => { onPremiumClick(); onClose(); }}
              className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-br from-primary/90 to-orange-600 border border-orange-400/30 shadow-lg group hover:brightness-110 transition-all"
            >
              <div className="size-10 rounded-full bg-overlay/20 flex items-center justify-center text-content shrink-0">
                <span className="material-symbols-outlined text-[20px] filled-icon">workspace_premium</span>
              </div>
              <div className="flex flex-col items-start overflow-hidden flex-1">
                <span className="text-sm font-bold text-content truncate w-full text-left">{texts.premiumTitle}</span>
                <span className="text-xs text-content/80 font-medium truncate w-full text-left">{texts.premiumDesc}</span>
              </div>
              <span className="material-symbols-outlined text-content/70 text-lg">chevron_right</span>
            </button>

            <button
              onClick={onLogout}
              className="group flex h-10 w-full items-center justify-center gap-2 rounded-lg text-content/60 hover:bg-red-500/10 hover:text-red-400 transition-colors mt-2"
            >
              <span className="material-symbols-outlined text-[20px]">logout</span>
              <span className="text-sm font-bold">{texts.logout}</span>
            </button>
            <p className="text-center text-[10px] font-medium text-content/30">v{texts.version}</p>
          </div>
        </div>
      </div>
    </div>
  );
};