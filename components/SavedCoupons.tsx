import React, { useState } from 'react';
import { Language } from '../types/core';
import { useTranslation } from '../hooks/useTranslation';
import { useAuth } from './layout/AuthProvider';
import { useUserFavorites, toggleFavorite, useIsFavorite } from '../hooks/useFirestore';

interface SavedCouponsProps {
  language: Language;
  onBack: () => void;
  onHome: () => void;
  onProfile: () => void;
  onCouponClick: (id: string) => void;
}

export const SavedCoupons: React.FC<SavedCouponsProps> = ({
  onBack,
  onCouponClick
}) => {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const { user } = useAuth();
  const { data: coupons, loading } = useUserFavorites(user?.uid, 'coupon');

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
              {t('saved.couponsTitle')}
            </h2>
          </div>
          <img src="/assets/ui/logo.png" alt="Hidden Logo" className="h-8 object-contain" />
        </header>

        <main className="flex-1 pb-8 px-4">

          {/* Segmented Control */}
          <div className="pt-4 mb-6">
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
          {coupons.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-10 text-center opacity-20">
              <span className="material-symbols-outlined text-6xl text-content mb-4">confirmation_number</span>
              <p className="text-content font-medium">{t('saved.emptyCoupons')}</p>
            </div>
          ) : (
            <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {coupons.map((coupon) => (
                <div
                  key={coupon.id}
                  onClick={() => onCouponClick(coupon.id)}
                  className={`group relative flex ${viewMode === 'list' ? 'flex-row h-32' : 'flex-col'} bg-overlay/5 rounded-2xl shadow-sm border border-overlay/5 overflow-hidden active:scale-[0.98] transition-all cursor-pointer hover:bg-white/[0.07]`}
                >
                  {/* Image Section */}
                  <div className={`relative ${viewMode === 'list' ? 'w-32 h-full' : 'h-40 w-full'} overflow-hidden shrink-0`}>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10"></div>
                    <div
                      className="w-full h-full bg-center bg-cover transform group-hover:scale-110 transition-transform duration-700"
                      style={{ backgroundImage: `url("${coupon.image}")` }}
                    ></div>

                    {/* Discount Badge */}
                    <div className={`absolute top-2 ${viewMode === 'list' ? 'left-2' : 'right-2'} z-20 bg-primary text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-lg shadow-primary/20`}>
                      {coupon.discount}
                    </div>

                    {/* Heart Button */}
                    <div className={`absolute top-2 ${viewMode === 'list' ? 'right-2' : 'left-2'} z-20`}>
                      <FavoriteButton item={coupon} userId={user?.uid} type="coupon" />
                    </div>
                  </div>

                  {/* Content Section */}
                  <div className={`flex flex-col ${viewMode === 'list' ? 'flex-1 justify-between p-3' : 'p-3 gap-1.5'}`}>
                    <div className="flex justify-between items-start">
                      <h3 className="text-content text-sm font-bold leading-tight line-clamp-2 group-hover:text-primary transition-colors">{coupon.title}</h3>
                    </div>

                    <p className="text-primary text-[11px] font-bold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">location_on</span>
                      {coupon.location}
                    </p>

                    <div className="flex flex-col gap-0.5 mt-auto">
                      <p className="text-[10px] text-content/40 truncate font-medium">
                        • {coupon.category}
                      </p>
                    </div>
                  </div>
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
    <button
      onClick={handleToggle}
      disabled={loading}
      className="flex h-8 w-8 items-center justify-center rounded-full bg-black/20 backdrop-blur-md transition-colors hover:bg-black/40 border border-overlay/10"
    >
      <span className={`material-symbols-outlined text-[18px] ${isSaved ? 'text-red-500 filled-icon' : 'text-white'}`}>
        favorite
      </span>
    </button>
  );
};