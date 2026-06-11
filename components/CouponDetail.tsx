import React, { useState, useMemo } from 'react';
import { Language } from '../types/core';
import { useParams, useNavigate } from 'react-router-dom';
import { useCoupon, useIsFavorite, toggleFavorite, useCoupons, useDestinations, useEvents, useRefugios } from '../hooks/useFirestore';
import { useAuth } from './layout/AuthProvider';
import { useRevenueCat } from './layout/RevenueCatProvider';
import { normalizeImage } from '../utils/imageHelpers';
import { useTranslation } from '../hooks/useTranslation';
import { Browser } from '@capacitor/browser';

interface CouponDetailProps {
  language: Language;
  onBack: () => void;
  couponId?: string;
}

export const CouponDetail: React.FC<CouponDetailProps> = ({ onBack, couponId: propId }) => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const finalId = propId || id;

  const { user } = useAuth();
  const { isSaved } = useIsFavorite(user?.uid, finalId, 'coupon');
  const [favLoading, setFavLoading] = useState(false);

  const { data: coupon, loading } = useCoupon(finalId);
  const navigate = useNavigate();
  const { isPremium } = useRevenueCat();
  const { data: allCoupons } = useCoupons();
  const { data: destinations } = useDestinations();
  const { data: events } = useEvents();
  const { data: allRefugios } = useRefugios();

  const linkedDestinations = useMemo(() => {
    if (!coupon || !coupon.destinationId || !destinations) return [];
    return destinations.filter(d => d.id === coupon.destinationId || d.customId === coupon.destinationId);
  }, [coupon, destinations]);

  const linkedRefugios = useMemo(() => {
    if (!coupon || !coupon.destinationId || !allRefugios) return [];
    return allRefugios.filter(r => 
      r.destinationId?.includes(coupon.destinationId) ||
      linkedDestinations.some(d => r.destinationId?.includes(d.id) || r.destinationId?.includes(d.customId))
    );
  }, [coupon, allRefugios, linkedDestinations]);

  const linkedEvents = useMemo(() => {
    if (!coupon || !coupon.destinationId || !events) return [];
    return events.filter(e => 
      e.destinationId === coupon.destinationId ||
      linkedDestinations.some(d => e.destinationId === d.id || e.destinationId === d.customId)
    );
  }, [coupon, events, linkedDestinations]);

  const linkedCoupons = useMemo(() => {
    if (!coupon || !coupon.destinationId || !allCoupons) return [];
    return allCoupons.filter(c => 
      c.id !== coupon.id && 
      (c.destinationId === coupon.destinationId ||
       linkedDestinations.some(d => c.destinationId === d.id || c.destinationId === d.customId))
    );
  }, [coupon, allCoupons, linkedDestinations]);

  const handleToggleFavorite = async () => {
    if (!user) {
      alert(t('common.loginSaveFavorites'));
      return;
    }
    if (!finalId || !coupon) return;

    try {
      setFavLoading(true);
      await toggleFavorite(user.uid, finalId, 'coupon', {
        title: coupon.title,
        image: coupon.image,
        location: coupon.location,
        discount: coupon.discount,
        category: coupon.category
      });
    } catch (err) {
      console.error("Error toggling favorite:", err);
      alert(t('common.errorSavingFavorite'));
    } finally {
      setFavLoading(false);
    }
  };

  if (loading) return <div className="h-screen w-full flex items-center justify-center bg-background-dark text-content-subtle">{t('coupon.loading')}</div>;
  if (!coupon) return <div className="h-screen w-full flex items-center justify-center bg-background-dark text-content-subtle">{t('coupon.notFound')}</div>;

  const displayTitle = coupon.title;
  const displayDescription = coupon.description;
  const displayRedemption = coupon.redemptionInstructions || '';

  const heroImage = normalizeImage(coupon.image);

  return (
    <div className="bg-background-dark font-display antialiased relative flex h-screen w-full flex-col overflow-y-auto overflow-x-hidden pb-24 no-scrollbar">
      {/* TopAppBar */}
      <div className="sticky top-0 z-50 flex items-center bg-surface-dark p-4 pt-safe justify-between border-b border-overlay/10 transition-colors">
        <button
          onClick={onBack}
          className="text-perks-secondary dark:text-content flex size-10 shrink-0 items-center justify-center cursor-pointer rounded-full hover:bg-overlay/5 transition-colors"
        >
          <span className="material-symbols-outlined text-2xl">arrow_back</span>
        </button>
        <h2 className="text-perks-secondary dark:text-content text-lg font-bold leading-tight tracking-tight flex-1 text-center">
          {displayTitle}
        </h2>
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: displayTitle,
                  text: displayDescription,
                  url: window.location.href,
                }).catch(console.error);
              } else {
                alert(t('common.shareNotSupported'));
              }
            }}
            className="flex items-center justify-center rounded-full hover:bg-overlay/5 transition-colors size-10 text-perks-secondary dark:text-content"
          >
            <span className="material-symbols-outlined text-2xl">share</span>
          </button>
          <button
            onClick={handleToggleFavorite}
            disabled={favLoading}
            className="flex items-center justify-center rounded-full hover:bg-overlay/5 transition-colors size-10 active:scale-90"
          >
            <span className={`material-symbols-outlined text-2xl transition-all ${isSaved ? 'filled-icon text-red-500' : 'text-perks-secondary dark:text-content'}`}>favorite</span>
          </button>
        </div>
      </div>

      {/* Hero Image Gallery */}
      <div className="w-full pt-4 pb-2 px-4">
        <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 no-scrollbar pb-2">
          {coupon.images && coupon.images.length > 0 ? (
            coupon.images.map((img, index) => (
              <div key={index} className="shrink-0 w-[85vw] h-72 bg-overlay/5 rounded-2xl overflow-hidden relative shadow-md group snap-center">
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                  style={{ backgroundImage: `url("${normalizeImage(img)}")` }}
                ></div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
              </div>
            ))
          ) : (
            <div className="shrink-0 w-full h-72 bg-overlay/5 rounded-2xl overflow-hidden relative shadow-md group">
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                style={{ backgroundImage: `url("${heroImage}")` }}
              ></div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
            </div>
          )}
        </div>
      </div>

      {/* Headline & Meta */}
      <div className="px-4 flex flex-col gap-1">
        <div className="flex justify-between items-start">
          <h1 className="text-perks-secondary dark:text-content tracking-tight text-3xl font-extrabold leading-tight">{displayTitle}</h1>
        </div>
        <div className="flex items-center gap-1.5 text-content-subtle dark:text-content-muted mt-1">
          <span className="material-symbols-outlined text-lg text-perks-primary">location_on</span>
          <p className="text-sm font-medium">{coupon.location}</p>
        </div>
      </div>

      {/* Chips / Tags */}
      <div className="flex gap-2 px-4 py-4 flex-wrap">
        <div className="flex items-center justify-center gap-x-1.5 rounded-full bg-orange-50 border border-orange-100 pl-3 pr-4 py-1.5 dark:bg-orange-900/20 dark:border-orange-800/30">
          <span className="material-symbols-outlined text-lg text-perks-primary">local_offer</span>
          <p className="text-perks-secondary dark:text-content text-sm font-bold">{coupon.discount}</p>
        </div>
        <div className="flex items-center justify-center gap-x-1.5 rounded-full bg-overlay/5 pl-3 pr-4 py-1.5 border border-overlay/5">
          <span className="material-symbols-outlined text-lg text-perks-accent dark:text-green-400">category</span>
          <p className="text-content-secondary text-sm font-medium uppercase">{coupon.category}</p>
        </div>
      </div>

      <div className="h-px w-full bg-overlay/10 my-2"></div>

      {/* Coupon Widget */}
      <div className="px-4 py-2">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-overlay/5 to-surface-dark border border-overlay/10 shadow-sm p-5">
          <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-background-dark border-r border-overlay/10"></div>
          <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-background-dark border-l border-overlay/10"></div>

          <div className="flex flex-col items-center justify-center gap-3 text-center">
            <p className="text-sm text-content-subtle dark:text-content-muted font-medium uppercase tracking-wider">{t('coupon.codeLabel')}</p>
            <div className="flex items-center gap-3 w-full">
              <div className="flex-1 border-2 border-dashed border-perks-primary/40 bg-orange-50/50 dark:bg-orange-900/10 rounded-xl p-3 flex items-center justify-center gap-2 group cursor-pointer hover:bg-orange-50 transition-colors">
                <span className="text-2xl font-black text-perks-secondary dark:text-content tracking-widest font-mono">{coupon.coupon_code}</span>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(coupon.coupon_code);
                  alert(t('common.codeCopied'));
                }}
                aria-label={t('common.copy')}
                className="flex items-center justify-center size-12 rounded-xl bg-perks-primary text-white shadow-lg shadow-orange-200 dark:shadow-orange-900/20 hover:bg-orange-500 active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined">content_copy</span>
              </button>
            </div>
            <p className="text-xs text-content-muted dark:text-content-subtle mt-1">{coupon.validity}</p>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="px-4 py-4">
        <h3 className="text-lg font-bold text-perks-secondary dark:text-content mb-2">{t('coupon.about')}</h3>
        <p className="text-content-secondary text-base leading-relaxed">
          {displayDescription}
        </p>
      </div>

      {/* Redemption Instructions */}
      {displayRedemption && (
        <div className="px-4 py-4 mt-2">
          <div className="bg-perks-primary/5 dark:bg-perks-primary/10 border border-perks-primary/20 rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <span className="material-symbols-outlined text-6xl text-perks-primary">info</span>
            </div>
            <h3 className="text-lg font-bold text-perks-secondary dark:text-content mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-perks-primary">how_to_reg</span>
              {t('coupon.redemption')}
            </h3>
            <p className="text-content-secondary text-base leading-relaxed relative z-10">
              {displayRedemption}
            </p>
          </div>
        </div>
      )}

      {/* Location Section */}
      <div className="px-4 py-2 pb-10">
        <h3 className="text-lg font-bold text-perks-secondary dark:text-content mb-3">{t('coupon.location')}</h3>
        <div className="relative w-full overflow-hidden rounded-2xl border border-overlay/10 bg-surface-dark shadow-sm transition-all hover:shadow-md group">
          <div
            className="absolute inset-0 opacity-[0.03] dark:opacity-[0.07] bg-cover bg-center grayscale pointer-events-none"
            style={{ backgroundImage: `url("${heroImage}")` }}
          ></div>

          <div className="relative p-5 flex flex-col gap-4">
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center size-12 rounded-xl bg-orange-50 dark:bg-orange-900/20 text-perks-primary shrink-0">
                <span className="material-symbols-outlined text-2xl">location_on</span>
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-perks-secondary dark:text-content font-bold text-base leading-tight">
                  {coupon.location}
                </p>
                <p className="text-content-subtle dark:text-content-muted text-xs font-medium">
                  {t('coupon.tapForMaps')}
                </p>
              </div>
            </div>

            <button
              onClick={async () => {
                const url = coupon.coordinates
                  ? `https://www.google.com/maps/search/?api=1&query=${coupon.coordinates.lat},${coupon.coordinates.lng}`
                  : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(coupon.location + " " + coupon.title)}`;
                await Browser.open({ url });
              }}
              className="w-full bg-perks-secondary dark:bg-white text-white dark:text-perks-secondary font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] hover:bg-black dark:hover:bg-gray-100 shadow-sm"
            >
              <span className="material-symbols-outlined text-xl">directions</span>
              {t('coupon.openMap')}
            </button>
          </div>
        </div>
      </div>

      {/* RELATED CAROUSELS */}
      <div className="mt-4 space-y-8 px-4 shrink-0 pb-12">
        {linkedDestinations.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-content flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">explore</span>
              {t('coupon.discountDestination')}
            </h3>
            <div className="flex overflow-x-auto no-scrollbar gap-4 pb-2">
              {linkedDestinations.map((dest) => {
                const bgImage = normalizeImage(dest.heroImage);
                return (
                  <div
                    key={dest.id}
                    onClick={() => navigate(`/destination/${dest.id}`)}
                    className="relative flex-none w-64 bg-surface-dark border border-overlay/5 rounded-2xl overflow-hidden p-3 shadow-md hover:border-primary/30 transition-all group cursor-pointer"
                  >
                    <div className="flex flex-col gap-2">
                      <div
                        className="w-full aspect-[16/10] rounded-xl bg-cover bg-center shadow-inner relative overflow-hidden"
                        style={{ backgroundImage: `url("${bgImage}")` }}
                      />
                      <div>
                        <h4 className="text-sm font-bold text-content truncate leading-snug group-hover:text-primary transition-colors">
                          {dest.title}
                        </h4>
                        <p className="text-[10px] text-content-muted truncate mt-0.5">{dest.location}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {linkedRefugios.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-content flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">home_work</span>
              {t('common.whereToStay')}
            </h3>
            <div className="flex overflow-x-auto no-scrollbar gap-4 pb-2">
              {linkedRefugios.map((ref) => {
                const bgImage = normalizeImage(ref.heroImage);
                return (
                  <div
                    key={ref.id}
                    onClick={() => navigate(`/refugio/${ref.id}`)}
                    className="relative flex-none w-64 bg-surface-dark border border-overlay/5 rounded-2xl overflow-hidden p-3 shadow-md hover:border-primary/30 transition-all group cursor-pointer"
                  >
                    <div className="flex flex-col gap-2">
                      <div
                        className="w-full aspect-[16/10] rounded-xl bg-cover bg-center shadow-inner relative overflow-hidden"
                        style={{ backgroundImage: `url("${bgImage}")` }}
                      />
                      <div>
                        <h4 className="text-sm font-bold text-content truncate leading-snug group-hover:text-primary transition-colors">
                          {ref.name}
                        </h4>
                        <p className="text-[10px] text-content-muted truncate mt-0.5">{ref.tagline || ref.location}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {linkedEvents.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-content flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">celebration</span>
              {t('coupon.nearbyEvents')}
            </h3>
            <div className="flex overflow-x-auto no-scrollbar gap-4 pb-2">
              {linkedEvents.map((evt) => {
                const bgImage = normalizeImage(evt.image);
                return (
                  <div
                    key={evt.id}
                    onClick={() => navigate(`/calendar/${evt.id}`)}
                    className="relative flex-none w-64 bg-surface-dark border border-overlay/5 rounded-2xl overflow-hidden p-3 shadow-md hover:border-primary/30 transition-all group cursor-pointer"
                  >
                    <div className="flex flex-col gap-2">
                      <div
                        className="w-full aspect-[16/10] rounded-xl bg-cover bg-center shadow-inner relative overflow-hidden"
                        style={{ backgroundImage: `url("${bgImage}")` }}
                      />
                      <div>
                        <h4 className="text-sm font-bold text-content truncate leading-snug group-hover:text-primary transition-colors">
                          {evt.name}
                        </h4>
                        <p className="text-[10px] text-content-muted truncate mt-0.5">{evt.date} • {evt.location}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {linkedCoupons.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-500">confirmation_number</span>
              <h3 className="text-lg font-bold leading-tight text-content">
                {t('coupon.otherDiscounts')}
              </h3>
            </div>
            <div className="flex overflow-x-auto no-scrollbar gap-4 pb-2">
              {linkedCoupons.map((linkedCoupon) => {
                const cpImage = normalizeImage(linkedCoupon.image);
                const canRedeem = !linkedCoupon.isPremium || isPremium;

                return (
                  <div
                    key={linkedCoupon.id}
                    onClick={canRedeem ? () => navigate(`/coupons/${linkedCoupon.id}`) : () => navigate('/premium')}
                    className="relative flex-none w-64 bg-surface-dark border border-overlay/5 rounded-2xl overflow-hidden p-3 shadow group cursor-pointer"
                  >
                    <div className={`flex flex-col gap-2.5 h-full ${!canRedeem ? 'opacity-55 blur-[0.5px]' : ''}`}>
                      <div
                        className="w-full aspect-[16/10] rounded-xl bg-cover bg-center shadow-inner relative overflow-hidden"
                        style={{ backgroundImage: `url("${cpImage}")` }}
                      >
                        <div className="absolute top-2 left-2 bg-emerald-500 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow">
                          {linkedCoupon.discount}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-content truncate leading-snug">{linkedCoupon.title}</h4>
                        <p className="text-[10px] text-content-muted truncate mt-0.5">{linkedCoupon.location}</p>
                      </div>
                    </div>

                    {!canRedeem && (
                      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[1px] rounded-2xl">
                        <div className="bg-surface-dark border border-overlay/10 p-2 rounded-full shadow-md mb-1">
                          <span className="material-symbols-outlined text-primary text-base block">lock</span>
                        </div>
                        <p className="text-content font-bold text-[11px]">{t('common.premiumExclusive')}</p>
                        <p className="text-primary text-[9px] font-bold mt-0.5">{t('common.tapToUnlock')}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      <div className="h-8"></div>

    </div>
  );
};
