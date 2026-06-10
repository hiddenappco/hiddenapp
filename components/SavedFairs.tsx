import React, { useState } from 'react';
import { Language } from '../types/core';
import { useTranslation } from '../hooks/useTranslation';
import { useAuth } from './layout/AuthProvider';
import { useUserFavorites, toggleFavorite, useIsFavorite } from '../hooks/useFirestore';

interface SavedFairsProps {
  language: Language;
  onBack: () => void;
  onFairClick: (id: string) => void;
}

export const SavedFairs: React.FC<SavedFairsProps> = ({
  onBack,
  onFairClick
}) => {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const { user } = useAuth();
  const { data: fairs, loading } = useUserFavorites(user?.uid, 'fair');

  if (loading) return <div className="h-screen w-full flex items-center justify-center bg-background-dark text-content/40">{t('common.loading')}</div>;

  return (
    <div className="bg-background-dark font-display text-content antialiased h-screen w-full overflow-y-auto no-scrollbar">
      <div className="relative flex min-h-full w-full flex-col overflow-x-hidden max-w-md mx-auto bg-background-dark shadow-xl">

        {/* Header */}
        <header className="sticky top-0 z-50 flex items-center bg-background-dark/95 backdrop-blur-md px-4 pb-2 pt-safe justify-between border-b border-overlay/5 transition-colors">
          <div className="flex items-center gap-2">
            <button
              onClick={onBack}
              className="text-content flex size-10 shrink-0 items-center justify-center cursor-pointer transition-opacity hover:opacity-70"
            >
              <span className="material-symbols-outlined text-2xl">arrow_back</span>
            </button>
            <h2 className="text-content text-lg font-bold leading-tight tracking-tight">
              {t('saved.fairsTitle')}
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

          {/* Content Grid/List */}
          {fairs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-10 text-center">
              <span className="material-symbols-outlined text-6xl text-gray-200 dark:text-content/10 mb-4">event_busy</span>
              <p className="text-content-subtle dark:text-content-muted font-medium">{t('saved.emptyFairs')}</p>
            </div>
          ) : (
            <div className={`grid gap-4 px-4 ${viewMode === 'grid' ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {fairs.map((fair) => (
                <div
                  key={fair.id}
                  onClick={() => onFairClick(fair.id)}
                  className={`group relative flex ${viewMode === 'list' ? 'flex-row gap-4 items-center bg-overlay/5 p-3 rounded-2xl border border-overlay/5 shadow-sm' : 'flex-col gap-3'} cursor-pointer hover:bg-white/[0.07] transition-all active:scale-[0.98]`}
                >
                  {/* Image */}
                  <div className={`relative overflow-hidden ${viewMode === 'list' ? 'size-24 rounded-xl shrink-0' : 'w-full aspect-video rounded-xl shadow-md'}`}>
                    <div
                      className="absolute inset-0 bg-center bg-no-repeat bg-cover transition-transform duration-700 group-hover:scale-110"
                      style={{ backgroundImage: `url("${fair.image}")` }}
                    >
                    </div>

                    {/* Heart Button */}
                    <FavoriteButton item={fair} userId={user?.uid} type="fair" />
                  </div>

                  {/* Content */}
                  <div className={`${viewMode === 'list' ? 'flex-1 min-w-0' : 'px-1'}`}>
                    <div className="flex justify-between items-start">
                      <p className={`text-content font-bold leading-tight group-hover:text-primary transition-colors truncate ${viewMode === 'list' ? 'text-lg mb-1' : 'text-sm'}`}>
                        {fair.name}
                      </p>
                    </div>

                    <div className="flex flex-col gap-1 mt-1">
                      <p className="text-content/40 text-[11px] font-bold flex items-center gap-1 truncate uppercase tracking-wider">
                        <span className="material-symbols-outlined text-[14px] text-primary">location_on</span>
                        {fair.location}
                      </p>
                      <p className="text-primary text-[11px] font-bold flex items-center gap-1 uppercase tracking-wider">
                        <span className="material-symbols-outlined text-[14px]">calendar_month</span>
                        {fair.date}
                      </p>
                    </div>
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
  const { isSaved } = useIsFavorite(userId, item.id, type);
  const [loading, setLoading] = React.useState(false);

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!userId) {
      alert(t('common.loginManageFavorites'));
      return;
    }
    setLoading(true);
    try {
      await toggleFavorite(userId, item.id, type);
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