import React, { useState, useMemo } from 'react';
import { Language } from '../types/core';
import { useTranslation } from '../hooks/useTranslation';
import { useRefugios, useIsFavorite, toggleFavorite } from '../hooks/useFirestore';
import { useAuth } from './layout/AuthProvider';
import { normalizeImage } from '../utils/imageHelpers';
import { matchesLocalizedSearch } from '../utils/localizedContent';
import { REFUGIO_SEARCH_FIELDS } from '../utils/localizeCatalog';

interface RefugiosProps {
  language: Language;
  onMenuClick: () => void;
  onRefugioClick: (refugioId: string) => void;
  onPremiumClick: () => void;
}

export const Refugios: React.FC<RefugiosProps> = ({
  onMenuClick,
  onRefugioClick,
  onPremiumClick
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  
  const { data: refugios, loading } = useRefugios();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');

  // Types list for horizontal filter
  const lodgingTypes = [
    { id: 'all', label: t('refugios.all'), icon: 'grid_view' },
    { id: 'glamping', label: t('refugios.glamping'), icon: 'wb_sunny' },
    { id: 'camping', label: t('refugios.camping'), icon: 'camping' },
    { id: 'hostal', label: t('refugios.hostal'), icon: 'home' },
    { id: 'hotel', label: t('refugios.hotel'), icon: 'apartment' },
    { id: 'cabana', label: t('refugios.cabin'), icon: 'cottage' },
    { id: 'ecolodge', label: t('refugios.ecolodge'), icon: 'forest' }
  ];

  const browseableRefugios = useMemo(
    () => refugios.filter(ref => ref.status !== 'Inactivo'),
    [refugios]
  );

  const matchesSearchTerm = (ref: (typeof refugios)[0], term: string) =>
    matchesLocalizedSearch(ref as Record<string, unknown>, term, [...REFUGIO_SEARCH_FIELDS]);

  const matchesType = (ref: (typeof refugios)[0]) => {
    if (selectedType === 'all') return true;
    const typesLower = ref.type?.map(t => t.toLowerCase()) || [];
    return typesLower.includes(selectedType.toLowerCase());
  };

  const filteredRefugios = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    if (!term && selectedType === 'all') {
      return [...browseableRefugios].sort(() => 0.5 - Math.random()).slice(0, 5);
    }

    return browseableRefugios.filter(ref => {
      if (!matchesType(ref)) return false;
      if (term) return matchesSearchTerm(ref, term);
      return true;
    });
  }, [browseableRefugios, searchTerm, selectedType]);

  const isSuggestedView = !searchTerm.trim() && selectedType === 'all';

  return (
    <div className="bg-background-dark text-content font-display antialiased overflow-x-hidden h-screen overflow-y-auto pb-28 no-scrollbar flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background-dark/95 backdrop-blur-md border-b border-overlay/5 px-4 pt-safe pb-3 flex items-center justify-between transition-colors duration-300 shrink-0">
        <button
          onClick={onMenuClick}
          className="flex items-center justify-center size-10 rounded-full text-content-secondary dark:text-white bg-surface-dark dark:bg-secondary hover:bg-overlay/10 dark:hover:bg-secondary/90 shadow-sm border border-overlay/10 transition-colors active:scale-95"
        >
          <span className="material-symbols-outlined text-[20px]">menu</span>
        </button>
        <h1 className="text-lg font-bold tracking-tight text-content flex-1 text-center">{t('refugios.title')}</h1>
        <div className="flex size-10 items-center justify-center">
          <img src="/assets/ui/logo.png" alt="Hidden Logo" className="w-8 h-8 object-contain" />
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-4 pt-4 shrink-0">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="material-symbols-outlined text-content-subtle group-focus-within:text-primary transition-colors">search</span>
          </div>
          <input
            className="block w-full pl-10 pr-10 py-3.5 border-none rounded-xl bg-overlay/5 text-sm text-content placeholder:text-content-muted focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-sm transition-all"
            placeholder={t('refugios.searchPlaceholder')}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-content-muted hover:text-primary"
            >
              <span className="material-symbols-outlined text-xl">cancel</span>
            </button>
          )}
        </div>
      </div>

      {/* Type Slider */}
      <div className="flex gap-2.5 px-4 py-4 overflow-x-auto no-scrollbar shrink-0">
        {lodgingTypes.map((type) => (
          <button
            key={type.id}
            onClick={() => setSelectedType(type.id)}
            className={`flex h-9 shrink-0 items-center justify-center gap-x-1.5 rounded-full px-4 transition-all active:scale-95 ${selectedType === type.id ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-surface-dark border border-overlay/10 text-content-secondary'}`}
          >
            <span className={`material-symbols-outlined text-[18px] ${selectedType === type.id ? 'text-white' : 'text-primary'}`}>{type.icon}</span>
            <span className="text-xs font-semibold">{type.label}</span>
          </button>
        ))}
      </div>

      {/* Refugios Cards Container */}
      <div className="flex-1 px-4 pb-12">
        {!loading && (
          <div className="flex items-center justify-between pt-1 pb-3">
            <h3 className="text-xs font-bold text-content-subtle uppercase tracking-widest">
              {isSuggestedView ? t('refugios.suggested') : t('refugios.results')}
            </h3>
            <span className="text-xs font-bold text-primary">
              {filteredRefugios.length} {t('refugios.resultCount')}
            </span>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-content-subtle">
            <div className="size-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-3"></div>
            <p className="text-sm font-medium">{t('refugios.loading')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredRefugios.length === 0 && (
              <div className="text-center py-20 opacity-50 flex flex-col items-center">
                <span className="material-symbols-outlined text-4xl mb-2">houseboat</span>
                <p className="text-sm">{t('refugios.noResults')}</p>
              </div>
            )}

            {filteredRefugios.map((ref) => {
              const bgImage = normalizeImage(ref.heroImage);
              const isMaintenance = ref.status === 'Mantenimiento';
              const isInactive = ref.status === 'Inactivo';

              return (
                <div
                  key={ref.id}
                  onClick={() => onRefugioClick(ref.id)}
                  className="bg-surface-dark rounded-2xl overflow-hidden shadow-md border border-overlay/5 hover:border-primary/45 transition-all duration-300 cursor-pointer group flex flex-col"
                >
                  {/* Card Media */}
                  <div className="relative aspect-[16/9] w-full overflow-hidden shrink-0">
                    <div
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                      style={{ backgroundImage: `url("${bgImage}")` }}
                    ></div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent"></div>
                    
                    {/* Status badge */}
                    {isMaintenance && (
                      <div className="absolute top-3 left-3 bg-amber-500 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded shadow">
                        Mantenimiento
                      </div>
                    )}
                    {isInactive && (
                      <div className="absolute top-3 left-3 bg-red-600 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded shadow">
                        Inactivo
                      </div>
                    )}

                    {/* Coupons badge */}
                    {ref.coupon && (
                      <div className="absolute bottom-3 left-3 bg-emerald-500 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow-sm flex items-center gap-1">
                        <span className="material-symbols-outlined text-[10px] filled-icon">confirmation_number</span>
                        {t('refugios.couponsAvailable')}
                      </div>
                    )}

                    {/* Favorite Button */}
                    <FavoriteButton item={ref} userId={user?.uid} />
                  </div>

                  {/* Card Details */}
                  <div className="p-4 flex flex-col flex-1 justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                        {ref.type?.slice(0, 2).map((t, idx) => (
                          <span key={idx} className="text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                            {t}
                          </span>
                        ))}
                      </div>

                      <h3 className="text-lg font-bold text-content leading-snug group-hover:text-primary transition-colors line-clamp-1">
                        {ref.name}
                      </h3>
                      
                      <p className="text-xs text-content-muted font-medium line-clamp-1 mb-2">
                        {ref.tagline}
                      </p>

                      <p className="text-xs text-content-subtle font-medium flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px] text-primary">location_on</span>
                        {ref.location}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-overlay/5">
                      {/* Amenities Preview */}
                      <div className="flex items-center gap-1.5">
                        {ref.amenities?.slice(0, 3).map((amenity, idx) => (
                          <span
                            key={idx}
                            title={amenity}
                            className="inline-flex size-6 items-center justify-center rounded-md bg-overlay/5 text-content-muted border border-overlay/5"
                          >
                            <span className="material-symbols-outlined text-xs">
                              {getAmenityIcon(amenity)}
                            </span>
                          </span>
                        ))}
                        {ref.amenities && ref.amenities.length > 3 && (
                          <span className="text-[10px] text-content-subtle font-bold">
                            +{ref.amenities.length - 3}
                          </span>
                        )}
                      </div>

                      {/* Detail CTA */}
                      <button className="bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                        {t('refugios.viewDetails')}
                        <span className="material-symbols-outlined text-xs">chevron_right</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// Reusable Favorite Button Component
const FavoriteButton = ({ item, userId }: { item: any, userId: string | undefined }) => {
  const { t } = useTranslation();
  const { isSaved } = useIsFavorite(userId, item.id, 'refugio');
  const [loading, setLoading] = useState(false);

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!userId) {
      alert(t('common.loginSaveFavorites'));
      return;
    }
    setLoading(true);
    try {
      const itemData = {
        name: item.name,
        heroImage: item.heroImage,
        location: item.location,
        tagline: item.tagline,
        type: item.type
      };
      await toggleFavorite(userId, item.id, 'refugio', itemData);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className="absolute top-3 right-3 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-black/20 backdrop-blur-md text-white border border-overlay/10 hover:bg-black/45 active:scale-90 transition-all"
    >
      <span className={`material-symbols-outlined text-[17px] ${isSaved ? 'text-red-500 filled-icon' : 'text-white'}`}>
        favorite
      </span>
    </button>
  );
};

// Mapping function for Material Symbols based on amenity names
const getAmenityIcon = (amenity: string): string => {
  const name = amenity.toLowerCase();
  if (name.includes('wifi') || name.includes('internet')) return 'wifi';
  if (name.includes('piscina') || name.includes('pool') || name.includes('alberca')) return 'pool';
  if (name.includes('parking') || name.includes('parqueadero') || name.includes('estacionamiento')) return 'local_parking';
  if (name.includes('pet') || name.includes('mascota')) return 'pets';
  if (name.includes('restaurante') || name.includes('comida') || name.includes('food')) return 'restaurant';
  if (name.includes('bar') || name.includes('bebida') || name.includes('drink')) return 'local_bar';
  if (name.includes('tv') || name.includes('televisión')) return 'tv';
  if (name.includes('aire') || name.includes('ac ') || name.includes('clima')) return 'ac_unit';
  if (name.includes('spa') || name.includes('masaje')) return 'spa';
  if (name.includes('vista') || name.includes('view') || name.includes('mirador')) return 'visibility';
  if (name.includes('fogata') || name.includes('camp') || name.includes('fire')) return 'local_fire_department';
  if (name.includes('baño') || name.includes('shower') || name.includes('ducha')) return 'shower';
  return 'done';
};
