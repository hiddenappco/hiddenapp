import React, { useState } from 'react';
import { Language } from '../types/core';
import { useTranslation } from '../hooks/useTranslation';
import { useDestinations, useIsFavorite, toggleFavorite } from '../hooks/useFirestore';
import { useAuth } from './layout/AuthProvider';
import { normalizeImage } from '../utils/imageHelpers';
import { useLocalizedSearch } from '../hooks/useLocalizedSearch';
import { DESTINATION_PICKER_SEARCH_FIELDS } from '../utils/localizeCatalog';
import { BOTTOM_NAV_SCROLL_PADDING, BOTTOM_NAV_SCROLL_SPACER } from '../utils/bottomNav';
import { PageLoadingScreen } from './ui/PageLoadingScreen';
import { StickyGlassHeader } from './ui/StickyGlassHeader';

interface ManualSearchProps {
  language: Language;
  onMenuClick: () => void;
  onResultClick: (resultId: string) => void;
}

export const ManualSearch: React.FC<ManualSearchProps> = ({ onMenuClick, onResultClick }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  const { data: destinations, loading } = useDestinations();

  const rankedResults = useLocalizedSearch(
    destinations as Record<string, unknown>[],
    searchTerm,
    DESTINATION_PICKER_SEARCH_FIELDS,
    { limit: 50 }
  );

  const filteredResults = React.useMemo(() => {
    if (!searchTerm.trim()) {
      return [...destinations].sort(() => 0.5 - Math.random()).slice(0, 5);
    }
    return rankedResults as typeof destinations;
  }, [destinations, searchTerm, rankedResults]);

  if (loading) {
    return <PageLoadingScreen titleKey="explore.loading" />;
  }

  return (
    <div className="bg-background-dark text-content font-display antialiased h-screen w-full flex flex-col overflow-hidden">

      <StickyGlassHeader onMenuClick={onMenuClick} title={t('explore.title')} titleLarge>
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <span className="material-symbols-outlined text-content/40 group-focus-within:text-primary transition-colors text-[22px]">search</span>
          </div>
          <input
            className="w-full h-12 rounded-2xl bg-overlay/5 border border-overlay/5 text-content placeholder:text-content/40 pl-12 pr-12 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-base font-medium"
            placeholder={t('explore.placeholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm ? (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-content/40 hover:text-content cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">cancel</span>
            </button>
          ) : (
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-content/40">
              <span className="material-symbols-outlined text-[20px]">mic</span>
            </div>
          )}
        </div>
      </StickyGlassHeader>

      {/* Results List */}
      <div className={`flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4 no-scrollbar ${BOTTOM_NAV_SCROLL_PADDING}`}>

          <>
            {/* Section Title */}
            <div className="flex items-center justify-between pt-2">
              <h3 className="text-xs font-bold text-content/40 uppercase tracking-widest">{t('explore.results')}</h3>
              <span className="text-xs font-bold text-primary">{filteredResults.length} resultados</span>
            </div>

            {/* Cards */}
            <div className="grid grid-cols-1 gap-4">
              {filteredResults.map((result) => {
                const bgImage = normalizeImage(result.heroImage);

                return (
                  <div
                    key={result.id}
                    onClick={() => onResultClick(result.id)}
                    className="group relative flex gap-4 p-3 bg-overlay/5 rounded-2xl border border-overlay/5 shadow-sm hover:bg-white/[0.07] hover:border-overlay/10 active:scale-[0.99] transition-all cursor-pointer"
                  >
                    {/* Image */}
                    <div
                      className="w-24 h-24 shrink-0 rounded-xl bg-overlay/10 bg-cover bg-center shadow-inner relative overflow-hidden"
                      style={{ backgroundImage: `url("${bgImage}")` }}
                    >
                      <FavoriteButton item={result} userId={user?.uid} />
                    </div>

                    {/* Info */}
                    <div className="flex flex-col flex-1 justify-center min-w-0">
                      <h4 className="text-base font-bold text-content truncate group-hover:text-primary transition-colors">
                        {result.title}
                      </h4>
                      <p className="text-sm text-content/40 truncate mb-2 font-medium">
                        {result.location}
                      </p>

                      <div className="flex items-center gap-2">
                        {result.verified && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg border text-blue-400 bg-blue-400/10 border-blue-400/20">
                            <span className="material-symbols-outlined text-[12px]">verified</span>
                            Verificado
                          </span>
                        )}
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg border text-primary bg-primary/10 border-primary/20">
                          Destino
                        </span>
                      </div>
                    </div>

                    {/* Arrow Icon */}
                    <div className="flex items-center justify-center pr-1 text-content/20 group-hover:text-primary transition-colors">
                      <span className="material-symbols-outlined">chevron_right</span>
                    </div>
                  </div>
                );
              })}

              {filteredResults.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center opacity-20">
                  <span className="material-symbols-outlined text-5xl text-content mb-2">location_off</span>
                  <p className="text-content font-medium">No encontramos resultados para "{searchTerm}"</p>
                </div>
              )}
            </div>
          </>

        {/* Footer Hint */}
        <div className="mt-8 flex flex-col items-center gap-4 opacity-20">
          <span className="material-symbols-outlined text-5xl text-content">travel_explore</span>
          <p className="text-content text-xs text-center max-w-xs font-medium tracking-wide leading-relaxed">{t('explore.footerHint')}</p>
        </div>
        <div className={`${BOTTOM_NAV_SCROLL_SPACER} w-full`} aria-hidden="true" />
      </div>
    </div>
  );
};

const FavoriteButton = ({ item, userId }: { item: { id: string; title?: string; heroImage?: string; location?: string }; userId: string | undefined }) => {
  const { t } = useTranslation();
  const { isSaved } = useIsFavorite(userId, item.id, 'destination');
  const [loading, setLoading] = React.useState(false);

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!userId) {
      alert(t('common.loginSaveFavorites'));
      return;
    }
    setLoading(true);
    try {
      await toggleFavorite(userId, item.id, 'destination', {
        title: item.title,
        heroImage: item.heroImage,
        location: item.location,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className="absolute top-1 right-1 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-black/20 backdrop-blur-md text-white border border-overlay/10 hover:bg-black/40 transition-colors"
    >
      <span className={`material-symbols-outlined text-[16px] ${isSaved ? 'text-red-500 filled-icon' : 'text-white'}`}>
        favorite
      </span>
    </button>
  );
};
