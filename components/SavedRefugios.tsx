import React, { useState } from 'react';
import { Language } from '../types/core';
import { useTranslation } from '../hooks/useTranslation';
import { useAuth } from './layout/AuthProvider';
import { useUserFavorites, toggleFavorite, useIsFavorite } from '../hooks/useFirestore';

interface SavedRefugiosProps {
  language: Language;
  onBack: () => void;
  onHome: () => void;
  onProfile: () => void;
  onRefugioClick: (id: string) => void;
}

export const SavedRefugios: React.FC<SavedRefugiosProps> = ({
  onBack,
  onRefugioClick
}) => {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const { user } = useAuth();
  const { data: refugios, loading } = useUserFavorites(user?.uid, 'refugio');

  if (loading) return <div className="h-screen w-full flex items-center justify-center bg-background-dark text-content/40">{t('common.loading')}</div>;

  return (
    <div className="bg-background-dark font-display text-content antialiased h-screen w-full overflow-y-auto no-scrollbar">
      <div className="relative flex min-h-full w-full flex-col overflow-x-hidden max-w-md mx-auto bg-background-dark shadow-xl">

        {/* Header */}
        <header className="sticky top-0 z-50 flex items-center bg-background-dark/90 backdrop-blur-md px-4 pb-2 pt-safe justify-between border-b border-overlay/5 transition-colors">
          <div className="flex items-center gap-2">
            <button
              onClick={onBack}
              className="text-content flex size-10 shrink-0 items-center justify-center cursor-pointer transition-opacity hover:opacity-70"
            >
              <span className="material-symbols-outlined text-2xl">arrow_back</span>
            </button>
            <h2 className="text-content text-lg font-bold leading-tight tracking-tight">
              {t('saved.lodgingsTitle')}
            </h2>
          </div>
          <img src="/assets/ui/logo.png" alt="Hidden Logo" className="h-8 object-contain" />
        </header>

        <main className="flex-1 pb-8">

          {/* Segmented Control */}
          <div className="px-4 pt-4 mb-2">
            <div className="flex h-10 w-full items-center justify-center rounded-xl bg-overlay/5 p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`flex flex-1 h-full items-center justify-center rounded-lg text-sm font-bold transition-all ${viewMode === 'grid'
                  ? 'bg-overlay/10 text-primary shadow-sm'
                  : 'text-content/40'
                  }`}
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">grid_view</span>
                  <span>{t('saved.grid')}</span>
                </div>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`flex flex-1 h-full items-center justify-center rounded-lg text-sm font-bold transition-all ${viewMode === 'list'
                  ? 'bg-overlay/10 text-primary shadow-sm'
                  : 'text-content/40'
                  }`}
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">format_list_bulleted</span>
                  <span>{t('saved.list')}</span>
                </div>
              </button>
            </div>
          </div>

          {/* Chips */}
          <div className="flex gap-3 px-4 pb-4 pt-2 overflow-x-auto no-scrollbar">
            <button className="flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-full bg-primary pl-5 pr-5 shadow-lg shadow-primary/20 transition-transform active:scale-95">
              <p className="text-white text-sm font-bold leading-normal">{t('saved.all')}</p>
            </button>
          </div>

          {/* Content Grid/List */}
          {refugios.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-10 text-center opacity-20">
              <span className="material-symbols-outlined text-6xl text-content mb-4">bookmark_border</span>
              <p className="text-content font-medium">{t('saved.emptyLodgings')}</p>
            </div>
          ) : (
            <div className={`grid gap-4 px-4 ${viewMode === 'grid' ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {refugios.map((ref) => (
                <div
                  key={ref.id}
                  onClick={() => onRefugioClick(ref.itemId || ref.id)}
                  className={`group relative flex ${viewMode === 'list' ? 'flex-row gap-4 items-center bg-overlay/5 p-3 rounded-2xl border border-overlay/5 shadow-sm' : 'flex-col gap-3'} cursor-pointer hover:bg-white/[0.07] transition-all`}
                >
                  {/* Image */}
                  <div className={`relative overflow-hidden ${viewMode === 'list' ? 'size-24 rounded-xl shrink-0' : 'w-full aspect-[3/4] rounded-xl'}`}>
                    <div
                      className="absolute inset-0 bg-center bg-no-repeat bg-cover transition-transform duration-500 group-hover:scale-110"
                      style={{ backgroundImage: `url("${ref.heroImage}")` }}
                    >
                    </div>

                    {/* Heart Button */}
                    <FavoriteButton item={ref} userId={user?.uid} type="refugio" />
                  </div>

                  {/* Content */}
                  <div className={`${viewMode === 'list' ? 'flex-1 min-w-0' : ''}`}>
                    <div className="flex justify-between items-start">
                      <p className={`text-content font-bold leading-tight group-hover:text-primary transition-colors truncate ${viewMode === 'list' ? 'text-lg mb-1' : 'text-base'}`}>
                        {ref.name}
                      </p>
                    </div>
                    {ref.tagline && (
                      <p className="text-content/60 text-xs truncate mt-0.5">{ref.tagline}</p>
                    )}
                    <p className="text-content/40 text-xs font-normal leading-normal mt-1 flex items-center gap-1 truncate">
                      <span className="material-symbols-outlined text-[14px] text-primary">location_on</span>
                      {ref.location}
                    </p>
                  </div>

                  {/* List Arrow */}
                  {viewMode === 'list' && (
                    <div className="text-content/20">
                      <span className="material-symbols-outlined">chevron_right</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

// Reusable Heart Component for the list
const FavoriteButton = ({ item, userId, type }: { item: any, userId: string | undefined, type: string }) => {
  const { t } = useTranslation();
  const { isSaved } = useIsFavorite(userId, item.itemId || item.id, type);
  const [loading, setLoading] = React.useState(false);

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!userId) {
      alert(t('common.loginManageFavorites'));
      return;
    }
    setLoading(true);
    try {
      await toggleFavorite(userId, item.itemId || item.id, type);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="absolute top-2 right-2 z-20">
      <button
        onClick={handleToggle}
        disabled={loading}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-black/20 backdrop-blur-md transition-colors hover:bg-black/40 border border-overlay/10"
      >
        <span className={`material-symbols-outlined text-[18px] ${isSaved ? 'text-red-500 filled-icon' : 'text-white'}`}>
          favorite
        </span>
      </button>
    </div>
  );
};
