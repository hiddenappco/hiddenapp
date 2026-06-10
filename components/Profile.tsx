import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Language } from '../types/core';
import { useTranslation } from '../hooks/useTranslation';
import { useAuth } from './layout/AuthProvider';
import { useUserProfile, useDepartments, useDestinations } from '../hooks/useFirestore';
import { useNavigate } from 'react-router-dom';
import { ExplorerProgress } from './ExplorerProgress';
import { useHardwareBackHandler } from '../hooks/useHardwareBackHandler';
import { ProfileUserIdentityCards } from './profile/ProfileUserIdentityCards';

interface ProfileProps {
  language: Language;
  onMenuClick: () => void;
  onSavedClick: () => void;
  onSavedCouponsClick: () => void;
  onSavedFairsClick: () => void;
  onSavedRefugiosClick: () => void;
  onNotificationsClick: () => void;
  onSupportClick: () => void;
  onSettingsClick: () => void;
  onPremiumClick: () => void;
}

export const Profile: React.FC<ProfileProps> = ({
  onMenuClick,
  onSavedClick,
  onSavedCouponsClick,
  onSavedFairsClick,
  onSavedRefugiosClick,
  onNotificationsClick,
  onSupportClick,
  onSettingsClick,
  onPremiumClick
}) => {
  const { t, language } = useTranslation();
  const { user } = useAuth();
  const { data: profile, loading: profileLoading } = useUserProfile(user?.uid);
  const { data: departments, loading: deptsLoading } = useDepartments();
  const { data: destinations, loading: destsLoading } = useDestinations();
  const navigate = useNavigate();
  const [isImageExpanded, setIsImageExpanded] = useState(false);

  useHardwareBackHandler(() => {
    if (isImageExpanded) {
      setIsImageExpanded(false);
      return true;
    }
    return false;
  }, [isImageExpanded]);

  const isLoading = profileLoading || deptsLoading || destsLoading;

  const displayName = profile?.displayName || profile?.name || user?.displayName || t('profile.traveler');

  // Location string logic
  let locationStr = profile?.country || "Colombia";
  if (profile?.country === 'Colombia' && profile?.department) {
    locationStr = `${profile.city || ''}${profile.city ? ', ' : ''}${profile.department}`;
  }

  if (isLoading) return <div className="h-screen w-full flex items-center justify-center bg-background-dark text-content-subtle">
    <div className="flex flex-col items-center gap-4">
      <div className="size-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      <p className="text-sm font-medium animate-pulse">{t('profile.preparing')}</p>
    </div>
  </div>;

  return (
    <div className="bg-background-dark font-display text-content antialiased h-screen w-full flex flex-col overflow-hidden relative selection:bg-primary selection:text-white">

      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between bg-background-dark/95 backdrop-blur-md px-4 pb-2 pt-safe border-b border-overlay/5 transition-colors shrink-0">
        <button
          onClick={onMenuClick}
          className="flex items-center justify-center size-10 rounded-full text-content-secondary dark:text-white bg-surface-dark dark:bg-secondary hover:bg-overlay/10 dark:hover:bg-[#0a1f35] shadow-sm border border-overlay/10 transition-colors active:scale-95"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>
        <h2 className="text-lg font-bold leading-tight tracking-tight flex-1 text-center text-content">{t('profile.title')}</h2>
        <div className="size-10 flex items-center justify-center">
          <button
            onClick={onSettingsClick}
            className="flex items-center justify-center size-10 rounded-full hover:bg-overlay/10 transition-colors text-content"
          >
            <span className="material-symbols-outlined">settings</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto no-scrollbar p-5 flex flex-col gap-8 pb-[calc(8rem+env(safe-area-inset-bottom,1.5rem))]">

        {/* Profile Hero */}
        <div className="flex flex-col items-center gap-3 py-2">
          <div className="relative">
            <motion.div
              layoutId="profile-img"
              onClick={() => setIsImageExpanded(true)}
              className="size-28 rounded-full p-1 bg-gradient-to-tr from-primary to-orange-300 shadow-xl shadow-primary/20 cursor-pointer active:scale-95 transition-transform"
            >
              <img
                src={user?.photoURL || "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y"}
                alt="Profile"
                className="w-full h-full object-cover rounded-full border-4 border-white dark:border-background-dark"
              />
            </motion.div>
          </div>

          {/* Expanded Image Overlay */}
          <AnimatePresence>
            {isImageExpanded && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsImageExpanded(false)}
                className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-6"
              >
                <motion.div
                  layoutId="profile-img"
                  className="relative w-full aspect-square max-w-sm rounded-[40px] overflow-hidden border-4 border-overlay/10 shadow-2xl"
                >
                  <img
                    src={user?.photoURL || "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y"}
                    alt="Profile Expanded"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsImageExpanded(false);
                    }}
                    className="absolute top-4 right-4 size-10 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white"
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="text-center">
            <h1 className="text-2xl font-extrabold text-content">{displayName}</h1>
            <div className="flex items-center justify-center gap-1 mt-1 text-content-muted">
              <span className="material-symbols-outlined text-primary text-[18px]">location_on</span>
              <span className="text-sm font-medium">{locationStr}</span>
            </div>
            {profile?.bio && (
              <p className="mt-3 text-sm text-content-muted max-w-xs mx-auto leading-relaxed italic">
                "{profile.bio}"
              </p>
            )}
          </div>
        </div>

        <ProfileUserIdentityCards profile={profile} onPremiumClick={onPremiumClick} />

        {/* Progreso del Explorador */}
        <ExplorerProgress
          departments={departments}
          destinations={destinations}
          completedActivities={profile?.completedActivities}
          navigate={navigate}
        />
        {/* Collections Section */}
        <div className="flex flex-col gap-4">
          <h3 className="text-base font-bold text-content px-1">{t('profile.collections')}</h3>

          <div className="grid grid-cols-2 gap-4">
            {/* 1. Destinos Guardados */}
            <div
              onClick={onSavedClick}
              className="relative w-full h-36 rounded-3xl overflow-hidden shadow-md group cursor-pointer ring-1 ring-black/5"
            >
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                style={{ backgroundImage: 'url("/assets/ui/paraiso.jpg")' }}
              ></div>
              <div className="absolute inset-0 bg-black/60 group-hover:bg-black/50 transition-colors"></div>
              <div className="absolute bottom-0 left-0 w-full p-4 flex items-end justify-between gap-1">
                <div className="flex-1 min-w-0">
                  <span className="material-symbols-outlined text-primary mb-1 block filled-icon">favorite</span>
                  <p className="text-white text-base font-bold leading-tight truncate">{t('profile.destinations')}</p>
                  <p className="text-white/70 text-[10px] uppercase tracking-wider font-bold truncate">{t('profile.favorites')}</p>
                </div>
                <span className="material-symbols-outlined text-white/80 text-xl group-hover:translate-x-1 transition-transform shrink-0">arrow_forward</span>
              </div>
            </div>

            {/* 2. Hospedajes Guardados */}
            <div
              onClick={onSavedRefugiosClick}
              className="relative w-full h-36 rounded-3xl overflow-hidden shadow-md group cursor-pointer ring-1 ring-black/5"
            >
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1510312305653-8ed496efae75?auto=format&fit=crop&w=300&q=80")' }}
              ></div>
              <div className="absolute inset-0 bg-black/60 group-hover:bg-black/50 transition-colors"></div>
              <div className="absolute bottom-0 left-0 w-full p-4 flex items-end justify-between gap-1">
                <div className="flex-1 min-w-0">
                  <span className="material-symbols-outlined text-primary mb-1 block">home_work</span>
                  <p className="text-white text-base font-bold leading-tight truncate">{t('profile.lodgings')}</p>
                  <p className="text-white/70 text-[10px] uppercase tracking-wider font-bold truncate">{t('profile.favorites')}</p>
                </div>
                <span className="material-symbols-outlined text-white/80 text-xl group-hover:translate-x-1 transition-transform shrink-0">arrow_forward</span>
              </div>
            </div>

            {/* 3. Cupones Guardados */}
            <div
              onClick={onSavedCouponsClick}
              className="relative w-full h-36 rounded-3xl overflow-hidden shadow-md group cursor-pointer ring-1 ring-black/5"
            >
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                style={{ backgroundImage: 'url("/assets/ui/cupones.webp")' }}
              ></div>
              <div className="absolute inset-0 bg-black/60 group-hover:bg-black/50 transition-colors"></div>
              <div className="absolute bottom-0 left-0 w-full p-4 flex items-end justify-between gap-1">
                <div className="flex-1 min-w-0">
                  <span className="material-symbols-outlined text-primary mb-1 block">local_activity</span>
                  <p className="text-white text-base font-bold leading-tight truncate">{t('profile.coupons')}</p>
                  <p className="text-white/70 text-[10px] uppercase tracking-wider font-bold truncate">{t('profile.favorites')}</p>
                </div>
                <span className="material-symbols-outlined text-white/80 text-xl group-hover:translate-x-1 transition-transform shrink-0">arrow_forward</span>
              </div>
            </div>

            {/* 4. Festivales Guardados */}
            <div
              onClick={onSavedFairsClick}
              className="relative w-full h-36 rounded-3xl overflow-hidden shadow-md group cursor-pointer ring-1 ring-black/5"
            >
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                style={{ backgroundImage: 'url("/assets/ui/festival.jpg")' }}
              ></div>
              <div className="absolute inset-0 bg-black/60 group-hover:bg-black/50 transition-colors"></div>
              <div className="absolute bottom-0 left-0 w-full p-4 flex items-end justify-between gap-1">
                <div className="flex-1 min-w-0">
                  <span className="material-symbols-outlined text-orange-400 mb-1 block">celebration</span>
                  <p className="text-white text-base font-bold leading-tight truncate">{t('profile.festivals')}</p>
                  <p className="text-white/70 text-[10px] uppercase tracking-wider font-bold truncate">{t('profile.favorites')}</p>
                </div>
                <span className="material-symbols-outlined text-white/80 text-xl group-hover:translate-x-1 transition-transform shrink-0">arrow_forward</span>
              </div>
            </div>
          </div>
        </div>
        {/* Quick Actions List */}
        <div className="flex flex-col gap-3">
          <button
            onClick={onNotificationsClick}
            className="group flex items-center gap-4 bg-overlay/5 hover:bg-overlay/10 p-4 rounded-2xl border border-overlay/5 transition-all active:scale-[0.98]"
          >
            <div className="size-11 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[22px]">notifications</span>
            </div>
            <div className="flex-1 text-left">
              <p className="font-bold text-content text-sm leading-none">{t('profile.updates')}</p>
              <p className="text-xs text-content-subtle mt-1">{t('profile.alerts')}</p>
            </div>
            <span className="material-symbols-outlined text-content/20 text-xl group-hover:translate-x-1 group-hover:text-primary transition-all">chevron_right</span>
          </button>

          <button
            onClick={onSupportClick}
            className="group flex items-center gap-4 bg-overlay/5 hover:bg-overlay/10 p-4 rounded-2xl border border-overlay/5 transition-all active:scale-[0.98]"
          >
            <div className="size-11 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[22px]">support_agent</span>
            </div>
            <div className="flex-1 text-left">
              <p className="font-bold text-content text-sm leading-none">{t('profile.help')}</p>
              <p className="text-xs text-content-subtle mt-1">{t('profile.support')}</p>
            </div>
            <span className="material-symbols-outlined text-content/20 text-xl group-hover:translate-x-1 group-hover:text-blue-400 transition-all">chevron_right</span>
          </button>
        </div>

        {/* Decorative Logo */}
        <div className="flex justify-center py-4 opacity-30 grayscale transition-all hover:opacity-50 hover:grayscale-0">
          <img
            src="/assets/ui/logo.png"
            alt="Hidden Logo"
            className="w-12 h-auto object-contain"
          />
        </div>

      </main >
    </div >
  );
};