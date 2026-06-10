import React, { useState } from 'react';
import { Language } from '../types/core';
import { useCoupons, useIsFavorite, toggleFavorite, useUserFavorites } from '../hooks/useFirestore';
import { useAuth } from './layout/AuthProvider';
import { normalizeImage } from '../utils/imageHelpers';
import { useRevenueCat } from './layout/RevenueCatProvider';
import { useTranslation } from '../hooks/useTranslation';

interface CouponsProps {
  language: Language;
  onMenuClick: () => void;
  onHome: () => void;
  onProfileClick: () => void;
  onPremiumClick: () => void;
  onCouponClick: (couponId: string) => void;
}

export const Coupons: React.FC<CouponsProps> = ({
  language,
  onMenuClick,
  onPremiumClick,
  onCouponClick
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isPremium } = useRevenueCat();
  const { data: coupons, loading } = useCoupons();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  const filterLabels = {
    all: t('coupon.all'),
    restaurants: t('coupon.restaurants'),
    lodging: t('coupon.lodging'),
    adventure: t('coupon.adventure'),
    mountain: t('coupon.mountain'),
    beach: t('coupon.beach')
  };

  const filterMap: Record<string, string> = {
    all: 'all',
    restaurants: 'restaurant',
    lodging: 'lodging',
    adventure: 'adventure',
    tours: 'tours',
    misc: 'misc'
  };

  // Filter logic
  const filteredCoupons = React.useMemo(() => {
    // If no search term and no filter, show 5 random ones as suggested
    if (!searchTerm.trim() && activeFilter === 'all') {
      return [...coupons].sort(() => 0.5 - Math.random()).slice(0, 5);
    }

    return coupons.filter(c => {
      // 1. Category Filter
      if (activeFilter !== 'all') {
        const targetCategory = filterMap[activeFilter];
        if (c.category !== targetCategory) return false;
      }

      // 2. Search Filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesTitle = (c.title?.toLowerCase() || "").includes(term);
        const matchesDesc = (c.description?.toLowerCase() || "").includes(term);
        const matchesLoc = (c.location?.toLowerCase() || "").includes(term);
        const matchesCat = (c.category?.toLowerCase() || "").includes(term);
        const matchesCode = (c.coupon_code?.toLowerCase() || "").includes(term);
        const matchesDiscount = (c.discount?.toLowerCase() || "").includes(term);

        if (!matchesTitle && !matchesDesc && !matchesLoc && !matchesCat && !matchesCode && !matchesDiscount) return false;
      }

      return true;
    });
  }, [coupons, searchTerm, activeFilter]);

  const regularCoupons = filteredCoupons.filter(c => !c.isPremium);
  const premiumCoupons = filteredCoupons.filter(c => c.isPremium);

  // Show only coupons with featuredCoupon toggle active
  const featuredCoupons = coupons.filter(c => c.featuredCoupon);

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
        <h1 className="text-lg font-bold tracking-tight text-content flex-1 text-center">{t('coupon.listTitle')}</h1>
        <div className="flex size-10 items-center justify-center">
          <img src="/assets/ui/logo.png" alt="Hidden Logo" className="w-8 h-8 object-contain" />
        </div>
      </div>

      {/* Search */}
      <div className="px-4 py-4 shrink-0">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="material-symbols-outlined text-content-subtle group-focus-within:text-perks-primary transition-colors">search</span>
          </div>
          <input
            className="block w-full pl-10 pr-3 py-3.5 border-none rounded-xl bg-overlay/5 text-sm text-content placeholder:text-content-muted focus:outline-none focus:ring-2 focus:ring-perks-primary/50 shadow-sm transition-all"
            placeholder={t('coupon.searchPlaceholder')}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-content-muted hover:text-perks-primary"
            >
              <span className="material-symbols-outlined text-xl">cancel</span>
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 px-4 pb-4 overflow-x-auto no-scrollbar shrink-0">
        <button
          onClick={() => setActiveFilter('all')}
          className={`flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-full px-4 transition-all active:scale-95 ${activeFilter === 'all' ? 'bg-perks-primary text-white shadow-lg shadow-perks-primary/20' : 'bg-overlay/5 border border-overlay/10 text-content-secondary'}`}
        >
          <span className={`material-symbols-outlined text-[18px] ${activeFilter === 'all' ? 'text-white' : 'text-green-600 dark:text-green-400'}`}>grid_view</span>
          <span className="text-sm font-medium">{filterLabels.all}</span>
        </button>
        <button
          onClick={() => setActiveFilter('restaurants')}
          className={`flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-full px-4 transition-all active:scale-95 ${activeFilter === 'restaurants' ? 'bg-perks-primary text-white shadow-lg shadow-perks-primary/20' : 'bg-surface-dark border border-overlay/10 text-content-secondary'}`}
        >
          <span className={`material-symbols-outlined text-[18px] ${activeFilter === 'restaurants' ? 'text-white' : 'text-perks-accent dark:text-green-400'}`}>restaurant</span>
          <span className="text-sm font-medium">{filterLabels.restaurants}</span>
        </button>
        <button
          onClick={() => setActiveFilter('lodging')}
          className={`flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-full px-4 transition-all active:scale-95 ${activeFilter === 'lodging' ? 'bg-perks-primary text-white shadow-lg shadow-perks-primary/20' : 'bg-surface-dark border border-overlay/10 text-content-secondary'}`}
        >
          <span className={`material-symbols-outlined text-[18px] ${activeFilter === 'lodging' ? 'text-white' : 'text-perks-accent dark:text-green-400'}`}>bed</span>
          <span className="text-sm font-medium">{filterLabels.lodging}</span>
        </button>
        <button
          onClick={() => setActiveFilter('adventure')}
          className={`flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-full px-4 transition-all active:scale-95 ${activeFilter === 'adventure' ? 'bg-perks-primary text-white shadow-lg shadow-perks-primary/20' : 'bg-surface-dark border border-overlay/10 text-content-secondary'}`}
        >
          <span className={`material-symbols-outlined text-[18px] ${activeFilter === 'adventure' ? 'text-white' : 'text-perks-accent dark:text-green-400'}`}>explore</span>
          <span className="text-sm font-medium">{filterLabels.adventure}</span>
        </button>
        <button
          onClick={() => setActiveFilter('tours')}
          className={`flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-full px-4 transition-all active:scale-95 ${activeFilter === 'tours' ? 'bg-perks-primary text-white shadow-lg shadow-perks-primary/20' : 'bg-surface-dark border border-overlay/10 text-content-secondary'}`}
        >
          <span className={`material-symbols-outlined text-[18px] ${activeFilter === 'tours' ? 'text-white' : 'text-perks-accent dark:text-green-400'}`}>tour</span>
          <span className="text-sm font-medium">Tours</span>
        </button>
      </div>

      {/* Featured Offers - Hide when searching */}
      {featuredCoupons.length > 0 && (
        <div className="mt-2 shrink-0">
          <div className="flex items-center justify-between px-4 pb-3 pt-2">
            <h3 className="text-lg font-bold leading-tight text-perks-secondary dark:text-content">{t('coupon.featured')}</h3>
            <a className="text-perks-primary text-sm font-semibold hover:underline" href="#">{t('coupon.seeAll')}</a>
          </div>
          <div className="flex overflow-x-auto no-scrollbar gap-4 px-4 pb-4">
            {featuredCoupons.map((coupon) => {
              const bgImage = normalizeImage(coupon.image);
              return (
                <div
                  key={coupon.id}
                  onClick={() => onCouponClick(coupon.id)}
                  className="relative flex-none w-72 rounded-2xl overflow-hidden aspect-[4/3] group cursor-pointer shadow-lg"
                >
                  <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                    style={{ backgroundImage: `url("${bgImage}")` }}
                  ></div>
                  <div className="absolute inset-0 bg-gradient-to-t from-perks-secondary/90 via-perks-secondary/20 to-transparent"></div>
                  <div className="absolute top-3 left-3 bg-perks-primary text-white text-xs font-bold px-2 py-1 rounded-md shadow-md">
                    {coupon.discount} OFF
                  </div>
                  <div className="absolute bottom-0 left-0 w-full p-4">
                    <p className="text-gray-200 text-xs font-medium uppercase tracking-wider mb-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">location_on</span> {coupon.location}
                    </p>
                    <h4 className="text-white text-lg font-bold leading-tight drop-shadow-sm">{coupon.title}</h4>
                    <p className="text-white/90 text-xs mt-1 line-clamp-2">{coupon.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Regular Coupons Section */}
      <div className="mt-2 px-4 shrink-0">
        <h3 className="text-lg font-bold leading-tight mb-4 text-content">{t('coupon.listTitle')}</h3>
        <div className="flex flex-col gap-4">
          {filteredCoupons.length === 0 && (
            <div className="text-center py-20 opacity-50 flex flex-col items-center">
              <span className="material-symbols-outlined text-4xl mb-2">sentiment_dissatisfied</span>
              <p>{t('coupon.noResults')}</p>
            </div>
          )}
          {regularCoupons.map((coupon) => {
            const bgImage = normalizeImage(coupon.image);
            return (
              <div
                key={coupon.id}
                onClick={() => onCouponClick(coupon.id)}
                className="bg-surface-dark rounded-xl p-3 flex gap-3 shadow-sm border border-overlay/5 hover:border-perks-primary/50 transition-colors cursor-pointer group"
              >
                <div
                  className="w-24 h-24 shrink-0 rounded-lg bg-cover bg-center relative overflow-hidden shadow-inner"
                  style={{ backgroundImage: `url("${bgImage}")` }}
                >
                  <FavoriteButton item={coupon} userId={user?.uid} type="coupon" />
                </div>
                <div className="flex flex-col flex-1 justify-between py-0.5">
                  <div>
                    <div className="flex justify-between items-start">
                      <h4 className="text-base font-bold text-content leading-tight">{coupon.title}</h4>
                      <span className="text-perks-primary font-bold text-sm whitespace-nowrap">{coupon.discount}</span>
                    </div>
                    <p className="text-green-600 dark:text-green-400 text-xs mt-1 flex items-center gap-1 font-medium">
                      <span className="material-symbols-outlined text-[14px]">confirmation_number</span> {coupon.category} • {coupon.location}
                    </p>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-content-muted">{coupon.validity}</span>
                    <button className="bg-perks-primary/10 hover:bg-perks-primary/20 text-perks-primary text-xs font-bold px-3 py-1.5 rounded-lg transition-colors">
                      {t('coupon.redeem')}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Premium Coupons Section */}
      <div className="mt-6 px-4 pb-8 shrink-0">
        <div className="flex items-center gap-2 mb-4">
          <span className="material-symbols-outlined text-yellow-500 filled-icon">workspace_premium</span>
          <h3 className="text-lg font-bold leading-tight text-perks-secondary dark:text-content">{t('coupon.premiumSection')}</h3>
        </div>

        <div className="flex flex-col gap-4">
          {premiumCoupons.map((coupon) => {
            const bgImage = normalizeImage(coupon.image);
            return (
              <div
                key={coupon.id}
                onClick={isPremium ? () => onCouponClick(coupon.id) : onPremiumClick}
                className="relative bg-surface-dark rounded-xl p-3 flex gap-3 border border-overlay/10 overflow-hidden group cursor-pointer"
              >
                <div className={`flex gap-3 w-full transition-all duration-300 ${!isPremium ? 'opacity-60 blur-[1px] group-hover:blur-[2px]' : ''}`}>
                  <div
                    className="w-24 h-24 shrink-0 rounded-lg bg-cover bg-center"
                    style={{ backgroundImage: `url("${bgImage}")` }}
                  ></div>
                  <div className="flex flex-col flex-1 justify-between py-0.5">
                    <div>
                      <div className="flex justify-between items-start">
                        <h4 className="text-base font-bold text-perks-secondary dark:text-content leading-tight">{coupon.title}</h4>
                        <span className="text-perks-secondary dark:text-content font-bold text-sm">-{coupon.discount}</span>
                      </div>
                      <p className="text-content-muted text-xs mt-1">{coupon.category} • {coupon.location}</p>
                    </div>
                    {isPremium ? (
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-xs text-content-muted">{coupon.validity}</span>
                        <button className="bg-perks-primary/10 hover:bg-perks-primary/20 text-perks-primary text-xs font-bold px-3 py-1.5 rounded-lg transition-colors">
                          {t('coupon.redeem')}
                        </button>
                      </div>
                    ) : (
                      <div className="h-6 w-20 bg-overlay/10 rounded mt-2"></div>
                    )}
                  </div>
                </div>

                {!isPremium && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[1px] group-hover:bg-black/50 transition-colors">
                    <div className="bg-surface-dark border border-overlay/10 p-2.5 rounded-full shadow-lg mb-1">
                      <span className="material-symbols-outlined text-primary text-xl block">lock</span>
                    </div>
                    <p className="text-content font-bold text-sm drop-shadow-sm shadow-black">{t('common.premiumExclusive')}</p>
                    <p className="text-primary text-xs font-bold mt-0.5">{t('common.tapToUnlock')}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
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
      alert(t('common.loginSaveFavorites'));
      return;
    }
    setLoading(true);
    try {
      const itemData = type === 'coupon' ? {
        title: item.title,
        image: item.image,
        location: item.location,
        discount: item.discount,
        category: item.category
      } : {}; // Generic fallback
      await toggleFavorite(userId, item.id, type, itemData);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className="absolute top-2 right-2 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-black/20 backdrop-blur-md text-white border border-overlay/10 hover:bg-black/40 transition-colors"
    >
      <span className={`material-symbols-outlined text-[16px] ${isSaved ? 'text-red-500 filled-icon' : 'text-white'}`}>
        favorite
      </span>
    </button>
  );
};