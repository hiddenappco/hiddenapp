import React from 'react';
import { Language } from '../types/core';
import { useTranslation } from '../hooks/useTranslation';
import { useOutletContext } from 'react-router-dom';
import { useDepartments } from '../hooks/useFirestore';
import { normalizeImage } from '../utils/imageHelpers';

interface HomeProps {
  language: Language;
  onExplore: (departmentId: string) => void;
  onMenuClick: () => void;
  onSearchClick: () => void;
}

export const Home: React.FC<HomeProps> = ({ language, onExplore, onMenuClick }) => {
  const { openMenu } = useOutletContext<{ openMenu: () => void }>();
  const { t } = useTranslation();

  // Real Data Hook
  const { data: departments, loading, error } = useDepartments();

  const texts = {
    title: t('home.title'),
    subtitle: t('home.subtitle'),
    exploreBtn: t('home.exploreBtn'),
    comingSoon: t('home.comingSoon'),
    activeLabel: t('home.available'),
    loading: t('home.loading'),
    error: t('home.error')
  };

  // Decorativo: Departamentos que no están en Firestore aún
  const decorativeDepartments = [
    {
      id: 'antioquia-decorative',
      name: 'Antioquia',
      tag: t('home.tagMountains'),
      heroImage: '/assets/ui/antioquia.webp',
      status: 'coming_soon',
      temp: '24°C'
    },
    {
      id: 'cundinamarca-decorative',
      name: 'Cundinamarca',
      tag: t('home.tagHighlands'),
      heroImage: '/assets/ui/cundinamarca.jpg',
      status: 'coming_soon',
      temp: '19°C'
    }
  ];

  // Sort departments: Active first, then Coming Soon
  const displayDepartments = [
    ...([...(departments || [])].sort((a, b) => {
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (a.status !== 'active' && b.status === 'active') return 1;
      return 0;
    })),
    ...decorativeDepartments
  ];

  if (loading) return (
    <div className="h-screen w-full bg-surface-dark flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
        <p className="text-content font-medium animate-pulse">{texts.loading}</p>
      </div>
    </div>
  );

  return (
    <div className="bg-background-dark text-content font-display h-screen flex flex-col relative overflow-hidden">

      {/* Background Ambience */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-0" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%239C92AC' fill-opacity='0.4' fill-rule='evenodd'/%3E%3C/svg%3E")`
      }}></div>

      {/* Header */}
      <header className="sticky top-0 left-0 right-0 z-30 flex items-center justify-between p-4 pt-safe bg-gradient-to-b from-background-dark/95 to-transparent pointer-events-none shrink-0">
        <button
          onClick={onMenuClick || openMenu}
          className="pointer-events-auto flex items-center justify-center size-10 rounded-full text-content bg-surface-dark hover:bg-surface-dark/80 shadow-lg border border-overlay/10 transition-colors"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>
        <div className="flex items-center gap-2 pointer-events-auto opacity-90">
          <img src="/assets/ui/logo.png" alt="Hidden Logo" className="h-8 w-auto drop-shadow-lg" />
        </div>
        <div className="size-10 pointer-events-none"></div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full overflow-y-auto no-scrollbar pt-3 pb-8 z-10">

        {/* Intro */}
        <div className="px-6 mb-6 text-center">
          <h1 className="text-3xl font-extrabold text-content leading-tight tracking-tight mb-1">
            {texts.title}
          </h1>
          <p className="text-content-muted text-sm font-medium">
            {texts.subtitle}
          </p>
        </div>

        {/* Cards Container */}
        <div className="flex flex-col gap-5 px-5 pb-10">
          {displayDepartments.map((dept: any) => {
            // Check status (mock property for coming soon logic)
            const isAvailable = dept.status !== 'coming_soon';

            // Normalize image from Rowy/Firestore
            const bgImage = normalizeImage(dept.heroImage);

            return (
              <div
                key={dept.id}
                onClick={() => {
                  console.log("🖱️ Clicking Department:", dept.id, dept.name);
                  isAvailable && onExplore(dept.departmentId || dept.id);
                }}
                className={`
                  relative w-full h-[220px] rounded-3xl overflow-hidden shadow-xl group transition-all duration-500
                  ${isAvailable ? 'cursor-pointer hover:shadow-2xl hover:scale-[1.02]' : 'cursor-default grayscale-[0.8]'}
                `}
              >
                {/* Background Image */}
                <div
                  className={`
                    absolute inset-0 bg-cover bg-center transition-transform duration-700
                    ${isAvailable ? 'group-hover:scale-110' : 'blur-[2px]'}
                  `}
                  style={{ backgroundImage: `url("${bgImage}")` }}
                ></div>

                {/* Overlays */}
                <div className={`absolute inset-0 bg-gradient-to-t ${isAvailable ? 'from-black/90 via-black/20 to-transparent' : 'from-black/80 to-black/40'}`}></div>

                {/* Coming Soon Overlay */}
                {!isAvailable && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                    <div className="bg-black/40 backdrop-blur-md p-3 rounded-full border border-overlay/20 mb-2">
                      <span className="material-symbols-outlined text-white text-3xl">lock</span>
                    </div>
                    <span className="px-3 py-1 bg-overlay/20 backdrop-blur-md rounded-lg text-xs font-bold text-white uppercase tracking-wider border border-overlay/30 shadow-sm">
                      {texts.comingSoon}
                    </span>
                  </div>
                )}

                {/* Content */}
                <div className="absolute bottom-0 left-0 w-full p-5 flex flex-col items-start z-10">
                  <div className="flex justify-between w-full items-end mb-1">
                    <div className="flex flex-col items-start">
                      <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold text-white uppercase tracking-wider mb-2 border shadow-sm ${isAvailable ? 'bg-primary/90 border-primary' : 'bg-gray-600/80 border-gray-500'}`}>
                        {dept.tag}
                      </span>
                      <h2 className="text-3xl font-extrabold text-white leading-none drop-shadow-md">
                        {dept.name}
                      </h2>
                    </div>

                    {/* Active State Stats */}
                    {isAvailable && (
                      <div className="flex flex-col gap-1 items-end mb-1">
                        <div className="flex items-center gap-1 text-white/90 bg-black/20 backdrop-blur-sm px-2 py-1 rounded-lg">
                          <span className="material-symbols-outlined text-[14px]">thermostat</span>
                          <span className="text-xs font-bold">{dept.temp}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Bar (Only Active) */}
                  {isAvailable && (
                    <div className="w-full mt-3 flex items-center justify-between border-t border-overlay/20 pt-3">
                      <span className="text-xs font-medium text-white/80 uppercase tracking-wide flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                        {texts.activeLabel}
                      </span>
                      <button className="flex items-center gap-1 text-white font-bold text-sm hover:text-primary transition-colors">
                        {texts.exploreBtn}
                        <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Decorative End Marker */}
          <div className="flex flex-col items-center justify-center py-6 opacity-40">
            <div className="w-1 h-8 bg-gradient-to-b from-overlay/20 to-transparent rounded-full"></div>
          </div>
        </div>

      </main>
    </div>
  );
};
