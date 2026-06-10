import React, { useState, useMemo } from 'react';
import { Language } from '../types/core';
import { useParams, useNavigate } from 'react-router-dom';
import { useEvent, useIsFavorite, toggleFavorite, useEvents, useDestinations, useCoupons, useRefugios } from '../hooks/useFirestore';
import { useAuth } from './layout/AuthProvider';
import { useRevenueCat } from './layout/RevenueCatProvider';
import { normalizeImage } from '../utils/imageHelpers';
import { pickLocalized } from '../utils/localizedContent';
import { useTranslation } from '../hooks/useTranslation';
import { Browser } from '@capacitor/browser';

interface FairDetailProps {
  language: Language;
  onBack: () => void;
  fairId?: string;
}

export const FairDetail: React.FC<FairDetailProps> = ({
  onBack,
  fairId: propId
}) => {
  const { t, language } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const finalId = propId || id;

  const { user } = useAuth();
  const { isSaved } = useIsFavorite(user?.uid, finalId, 'fair');
  const [favLoading, setFavLoading] = useState(false);

  const { data: event, loading } = useEvent(finalId);
  const navigate = useNavigate();
  const { isPremium } = useRevenueCat();
  const { data: allEvents } = useEvents();
  const { data: destinations } = useDestinations();
  const { data: coupons } = useCoupons();
  const { data: allRefugios } = useRefugios();

  const linkedDestinations = useMemo(() => {
    if (!event || !event.destinationId || !destinations) return [];
    return destinations.filter(d => 
      d.id === event.destinationId || d.customId === event.destinationId
    );
  }, [event, destinations]);

  const linkedRefugios = useMemo(() => {
    if (!event || !event.destinationId || !allRefugios) return [];
    return allRefugios.filter(r => 
      r.destinationId?.includes(event.destinationId) ||
      linkedDestinations.some(d => r.destinationId?.includes(d.id) || r.destinationId?.includes(d.customId))
    );
  }, [event, allRefugios, linkedDestinations]);

  const linkedCoupons = useMemo(() => {
    if (!event || !event.destinationId || !coupons) return [];
    return coupons.filter(c => 
      c.destinationId === event.destinationId ||
      linkedDestinations.some(d => c.destinationId === d.id || c.destinationId === d.customId)
    );
  }, [event, coupons, linkedDestinations]);

  const linkedEvents = useMemo(() => {
    if (!event || !event.destinationId || !allEvents) return [];
    return allEvents.filter(e => 
      e.id !== event.id && (
        e.destinationId === event.destinationId ||
        linkedDestinations.some(d => e.destinationId === d.id || e.destinationId === d.customId)
      )
    );
  }, [event, allEvents, linkedDestinations]);

  const handleToggleFavorite = async () => {
    if (!user) {
      alert(t('common.loginSaveFavorites'));
      return;
    }
    if (!finalId || !event) return;

    try {
      setFavLoading(true);
      const eventDoc = event as Record<string, unknown>;
      const favName = pickLocalized(eventDoc, 'name', language) || event.name;
      await toggleFavorite(user.uid, finalId, 'fair', {
        name: favName,
        image: event.image,
        location: event.location,
        date: event.date
      });
    } catch (err) {
      console.error("Error toggling favorite:", err);
      alert(t('common.errorSavingFavorite'));
    } finally {
      setFavLoading(false);
    }
  };

  const handleShare = async () => {
    if (!event) return;
    const eventDoc = event as Record<string, unknown>;
    const shareName = pickLocalized(eventDoc, 'name', language) || event.name;
    const shareDescription = pickLocalized(eventDoc, 'description', language) || event.description;
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareName,
          text: shareDescription,
          url: window.location.href,
        });
      } catch (err) {
        console.log('Share failed:', err);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert(t('common.linkCopiedClipboard'));
    }
  };

  if (loading) return <div className="h-screen w-full flex items-center justify-center bg-background-dark text-content">{t('fair.loading')}</div>;
  if (!event) return <div className="h-screen w-full flex items-center justify-center bg-background-dark text-content">{t('fair.notFound')}</div>;

  const eventDoc = event as Record<string, unknown>;
  const displayName = pickLocalized(eventDoc, 'name', language) || event.name;
  const displaySubtitle = pickLocalized(eventDoc, 'subtitle', language) || event.subtitle;
  const displayDescription = pickLocalized(eventDoc, 'description', language) || event.description;
  const displayTips = pickLocalized(eventDoc, 'tips', language) || event.tips;

  return (
    <div className="relative flex h-screen w-full flex-col bg-background-dark font-display text-content antialiased overflow-y-auto overflow-x-hidden no-scrollbar">

      <div className="relative w-full h-[45vh] shrink-0">
        <div className="flex w-full h-full overflow-x-auto snap-x snap-mandatory no-scrollbar bg-overlay/10">
          {event.images && event.images.length > 0 ? (
            event.images.map((img, index) => (
              <div key={index} className="shrink-0 w-full h-full relative snap-center">
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url("${img}")` }}
                ></div>
                <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-transparent to-transparent"></div>
              </div>
            ))
          ) : (
            <div className="shrink-0 w-full h-full relative snap-center">
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url("${event.image}")` }}
              ></div>
              <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-transparent to-transparent"></div>
            </div>
          )}
        </div>

        <div className="absolute top-0 left-0 w-full z-20 p-4 pt-safe flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
          <button
            onClick={onBack}
            className="pointer-events-auto flex items-center justify-center size-10 rounded-full bg-overlay/10 backdrop-blur-md text-white hover:bg-overlay/20 transition-colors"
          >
            <span className="material-symbols-outlined text-[24px]">arrow_back</span>
          </button>
          <div className="flex gap-3 pointer-events-auto">
            <button
              onClick={handleShare}
              className="flex items-center justify-center size-10 rounded-full bg-overlay/10 backdrop-blur-md text-white hover:bg-overlay/20 transition-colors"
            >
              <span className="material-symbols-outlined text-[24px]">share</span>
            </button>
            <button
              onClick={handleToggleFavorite}
              disabled={favLoading}
              className="flex items-center justify-center size-10 rounded-full bg-overlay/10 backdrop-blur-md hover:bg-overlay/20 transition-colors active:scale-90"
            >
              <span
                className={`material-symbols-outlined text-[24px] transition-all ${isSaved ? 'filled-icon text-red-500' : 'text-white'}`}
              >
                favorite
              </span>
            </button>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 w-full p-6 pb-12 pointer-events-none">
          <h1 className="text-content text-3xl font-extrabold leading-tight drop-shadow-md mb-1">{displayName}</h1>
          {displaySubtitle && (
            <p className="text-content/80 text-sm italic font-medium mb-2 drop-shadow-sm">"{displaySubtitle}"</p>
          )}
          <div className="flex items-center text-content text-sm font-medium gap-1">
            <span className="material-symbols-outlined text-primary text-[18px]">location_on</span>
            <p>{event.location}</p>
          </div>
        </div>
      </div>

      <div className="relative bg-background-dark -mt-4 rounded-t-3xl px-5 pt-8 flex flex-col gap-6 z-10 pb-32 shadow-[0_-10px_20px_rgba(0,0,0,0.5)]">
        <div className="grid grid-cols-3 gap-3 border-b border-overlay/5 pb-6">
          <div className="flex flex-col items-center justify-center text-center gap-1 bg-overlay/5 p-3 rounded-2xl border border-overlay/5">
            <div className="size-8 rounded-full bg-orange-400/10 flex items-center justify-center text-orange-400 mb-0.5">
              <span className="material-symbols-outlined text-xl">calendar_month</span>
            </div>
            <p className="text-[10px] text-content/40 font-bold uppercase">{t('fair.date')}</p>
            <p className="text-[13px] font-bold text-content">{event.date}</p>
          </div>

          <div className="flex flex-col items-center justify-center text-center gap-1 bg-overlay/5 p-3 rounded-2xl border border-overlay/5">
            <div className={`size-8 rounded-full flex items-center justify-center mb-0.5 ${event.priceType === 'Gratuito'
              ? 'bg-emerald-500/10 dark:bg-emerald-400/10 text-emerald-600 dark:text-emerald-400'
              : 'bg-primary/10 text-primary'
              }`}>
              <span className="material-symbols-outlined text-xl">payments</span>
            </div>
            <p className="text-[10px] text-content/40 font-bold uppercase">{t('fair.cost')}</p>
            <p className={`text-[13px] font-bold ${event.priceType === 'Gratuito' ? 'text-emerald-600 dark:text-emerald-400' : 'text-primary'
              }`}>
              {event.priceType || t('fair.tba')}
            </p>
          </div>

          {event.url ? (
            <button
              onClick={() => Browser.open({ url: event.url })}
              className="flex flex-col items-center justify-center text-center gap-1 bg-primary p-3 rounded-2xl shadow-lg shadow-primary/20 active:scale-95 transition-transform"
            >
              <div className="size-8 rounded-full bg-overlay/20 flex items-center justify-center text-white mb-0.5">
                <span className="material-symbols-outlined text-xl">
                  {event.priceType === 'Gratuito' ? 'info' : 'local_activity'}
                </span>
              </div>
              <p className="text-[11px] text-white font-bold uppercase tracking-tighter">
                {event.priceType === 'Gratuito' ? t('fair.moreInfo') : t('fair.tickets')}
              </p>
              <span className="material-symbols-outlined text-white text-sm">open_in_new</span>
            </button>
          ) : (
            <div className="flex flex-col items-center justify-center text-center gap-1 bg-overlay/5 p-3 rounded-2xl border border-overlay/5 opacity-50">
              <div className="size-8 rounded-full bg-overlay/5 flex items-center justify-center text-content/20 mb-0.5">
                <span className="material-symbols-outlined text-xl">link_off</span>
              </div>
              <p className="text-[11px] text-content/20 font-medium">{t('fair.noLink')}</p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="text-xl font-bold text-content tracking-tight">{t('fair.about')}</h2>
          <p className="text-content/60 text-base leading-relaxed">
            {displayDescription}
          </p>
        </div>

        {displayTips && (
          <div className="flex flex-col gap-4 bg-orange-400/5 rounded-2xl p-6 border border-orange-400/10 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <span className="material-symbols-outlined text-6xl text-orange-400">lightbulb</span>
            </div>
            <div className="flex items-center gap-2 mb-1 z-10">
              <div className="bg-orange-400/20 p-2 rounded-xl text-orange-400">
                <span className="material-symbols-outlined text-[20px]">lightbulb</span>
              </div>
              <h3 className="text-lg font-bold text-content">{t('fair.eventTips')}</h3>
            </div>
            <p className="text-content/70 text-sm leading-relaxed whitespace-pre-wrap z-10">
              {displayTips}
            </p>
          </div>
        )}

        <div className="flex flex-col gap-3 pb-10">
          <h2 className="text-xl font-bold text-content tracking-tight">{t('fair.location')}</h2>
          <div className="relative w-full overflow-hidden rounded-[28px] border border-overlay/5 bg-overlay/5 shadow-sm group">
            <div
              className="absolute inset-0 opacity-[0.05] bg-cover bg-center grayscale pointer-events-none"
              style={{ backgroundImage: `url("${event.image}")` }}
            ></div>

            <div className="relative p-6 flex flex-col gap-4">
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center size-14 rounded-2xl bg-primary/10 text-primary shrink-0 border border-primary/10">
                  <span className="material-symbols-outlined text-2xl">location_on</span>
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-content font-bold text-base leading-tight pr-4">
                    {event.location}
                  </p>
                  <p className="text-content/40 text-[11px] font-bold uppercase tracking-wider mt-0.5">
                    {t('fair.exactLocation')}
                  </p>
                </div>
              </div>

              <button
                onClick={async () => {
                  const url = event.coordinates
                    ? `https://www.google.com/maps/search/?api=1&query=${event.coordinates.lat},${event.coordinates.lng}`
                    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location + " " + event.name)}`;
                  await Browser.open({ url });
                }}
                className="w-full bg-overlay text-background-dark font-black py-4 rounded-2xl text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] hover:opacity-90 shadow-xl"
              >
                <span className="material-symbols-outlined text-xl">directions</span>
                {t('fair.howToGetThere')}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-8 shrink-0 pb-12">
          {linkedDestinations.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-content flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">explore</span>
                {t('fair.fairDestination')}
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
                {t('common.whereToStayNearby')}
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

          {linkedCoupons.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-500">confirmation_number</span>
                <h3 className="text-lg font-bold leading-tight text-content">
                  {t('refugio.destinationDiscounts')}
                </h3>
              </div>
              <div className="flex overflow-x-auto no-scrollbar gap-4 pb-2">
                {linkedCoupons.map((coupon) => {
                  const cpImage = normalizeImage(coupon.image);
                  const canRedeem = !coupon.isPremium || isPremium;

                  return (
                    <div
                      key={coupon.id}
                      onClick={canRedeem ? () => navigate(`/coupons/${coupon.id}`) : () => navigate('/premium')}
                      className="relative flex-none w-64 bg-surface-dark border border-overlay/5 rounded-2xl overflow-hidden p-3 shadow group cursor-pointer"
                    >
                      <div className={`flex flex-col gap-2.5 h-full ${!canRedeem ? 'opacity-55 blur-[0.5px]' : ''}`}>
                        <div
                          className="w-full aspect-[16/10] rounded-xl bg-cover bg-center shadow-inner relative overflow-hidden"
                          style={{ backgroundImage: `url("${cpImage}")` }}
                        >
                          <div className="absolute top-2 left-2 bg-emerald-500 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow">
                            {coupon.discount}
                          </div>
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-content truncate leading-snug">{coupon.title}</h4>
                          <p className="text-[10px] text-content-muted truncate mt-0.5">{coupon.location}</p>
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

          {linkedEvents.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-content flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">celebration</span>
                {t('fair.otherFairs')}
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
        </div>
      </div>
    </div>
  );
};
