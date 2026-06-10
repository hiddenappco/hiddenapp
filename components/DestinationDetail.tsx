import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDestination, useIsFavorite, toggleFavorite, useUserProfile, toggleDestinationActivity, useRefugios, useEvents, useCoupons } from '../hooks/useFirestore';
import { useAuth } from './layout/AuthProvider';
import { useRevenueCat } from './layout/RevenueCatProvider';
import { normalizeImage } from '../utils/imageHelpers';
import { Browser } from '@capacitor/browser';
import { Language } from '../types/core';
import { useHardwareBackHandler } from '../hooks/useHardwareBackHandler';
import { pickLocalized, pickLocalizedStringArray, pickLocalizedObjectArray } from '../utils/localizedContent';
import type { GettingThereItem, PricingItem } from '../types/content';
import { useTranslation } from '../hooks/useTranslation';

// Sub-components
import { DestinationHero } from './destination/DestinationHero';
import { DestinationActions } from './destination/DestinationActions';
import { DestinationInfo } from './destination/DestinationInfo';
import { DestinationGettingThere } from './destination/DestinationGettingThere';
import { DestinationActivities } from './destination/DestinationActivities';
import { DestinationGallery } from './destination/DestinationGallery';
import { DestinationPricing } from './destination/DestinationPricing';
import { DestinationPacking } from './destination/DestinationPacking';
import { pickLocalizedPackingGuide } from '../utils/packingGuide';

interface DestinationDetailProps {
  language: Language;
  onBack: () => void;
  destinationId?: string;
}

export const DestinationDetail: React.FC<DestinationDetailProps> = ({
  onBack,
  destinationId: propId
}) => {
  const { t, language } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const finalId = id || propId;

  const { data: destination, loading } = useDestination(finalId);
  const { user } = useAuth();
  const { isSaved } = useIsFavorite(user?.uid, finalId, 'destination');
  const [favLoading, setFavLoading] = useState(false);
  const { data: userProfile } = useUserProfile(user?.uid);
  const completedActivities = userProfile?.completedActivities?.[finalId || ''] || [];

  const navigate = useNavigate();
  const { isPremium } = useRevenueCat();
  const { data: allRefugios } = useRefugios();
  const { data: allEvents } = useEvents();
  const { data: allCoupons } = useCoupons();

  const lodgingResults = React.useMemo(() => {
    const customId = destination?.customId;
    return allRefugios.filter(r => 
      r.destinationId?.includes(finalId || '') || 
      (customId && r.destinationId?.includes(customId))
    );
  }, [allRefugios, finalId, destination]);

  const eventResults = React.useMemo(() => {
    const customId = destination?.customId;
    return allEvents.filter(e => 
      e.destinationId === finalId || 
      (customId && e.destinationId === customId)
    );
  }, [allEvents, finalId, destination]);

  const couponResults = React.useMemo(() => {
    const customId = destination?.customId;
    return allCoupons.filter(c => 
      c.destinationId === finalId || 
      (customId && c.destinationId === customId)
    );
  }, [allCoupons, finalId, destination]);

  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  useHardwareBackHandler(() => {
    if (expandedIdx !== null) {
      setExpandedIdx(null);
      return true;
    }
    return false;
  }, [expandedIdx]);

  const handleToggleActivity = async (index: number) => {
    if (!user || !finalId) return;
    const isCompleted = completedActivities.includes(index);
    await toggleDestinationActivity(user.uid, finalId, index, isCompleted);
  };

  const handleToggleFavorite = async () => {
    if (!user) {
      alert(t('common.loginSaveFavorites'));
      return;
    }
    if (!finalId || !destination) return;
    try {
      setFavLoading(true);
      const destDoc = destination as Record<string, unknown>;
      const favTitle = pickLocalized(destDoc, 'title', language) || destination.title;
      const favLocation = pickLocalized(destDoc, 'location', language) || destination.location;
      await toggleFavorite(user.uid, finalId, 'destination', {
        title: favTitle,
        heroImage: destination.heroImage,
        location: favLocation
      });
    } catch (err) {
      console.error("Error toggling favorite:", err);
    } finally {
      setFavLoading(false);
    }
  };

  const destDoc = destination ? (destination as Record<string, unknown>) : null;
  const localizedDescription = destDoc ? pickLocalized(destDoc, 'description', language) : '';
  const localizedTitle = destDoc
    ? pickLocalized(destDoc, 'title', language) || destination!.title
    : '';
  const localizedLocation = destDoc
    ? pickLocalized(destDoc, 'location', language) || destination!.location
    : '';

  const handleShare = async () => {
    if (navigator.share && destination) {
      try {
        await navigator.share({
          title: localizedTitle,
          text: localizedDescription,
          url: window.location.href,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert(t('common.linkCopied'));
    }
  };

  const handleOpenMap = async () => {
    if (!destination) return;
    const url = destination.coordinates
      ? `https://www.google.com/maps/search/?api=1&query=${destination.coordinates.lat},${destination.coordinates.lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${localizedLocation || destination.location} ${localizedTitle || destination.title}`)}`;
    await Browser.open({ url });
  };

  const handleDownloadPdf = async () => {
    if (destination?.pdfFile) {
      await Browser.open({ url: destination.pdfFile });
    } else {
      alert(t('common.premiumGuideOnly'));
    }
  };

  const texts = {
    closed: t('destination.closed'),
    verified: t('destination.verified'),
    downloadPdf: t('destination.downloadPdf'),
    downloadPremium: t('destination.downloadPremium'),
    loading: t('destination.loading'),
    notFound: t('destination.notFound'),
    aboutTitle: t('destination.about'),
    readMore: t('common.readMore'),
    readLess: t('common.readLess'),
    stats: {
      hiking: t('destination.statsHiking'),
      signal: t('destination.statsSignal')
    },
    aiTipTitle: t('common.aiTipTitle'),
    gettingThereTitle: t('destination.gettingThere'),
    activitiesTitle: t('destination.mustDo'),
    activitiesSubtitle: t('destination.activitiesSubtitle'),
    galleryTitle: t('destination.gallery'),
    viewMap: t('destination.viewMap'),
    pinchZoom: t('destination.pinchZoom'),
  };

  if (loading) return <div className="h-screen w-full flex items-center justify-center bg-background-dark text-content">{texts.loading}</div>;
  if (!destination) return <div className="h-screen w-full flex items-center justify-center bg-background-dark text-content">{texts.notFound}</div>;

  const localizedAiTip = destDoc ? pickLocalized(destDoc, 'aiTip', language) : '';
  const localizedActivities = destDoc ? pickLocalizedStringArray(destDoc, 'activities', language) : [];
  const localizedGettingThere = destDoc
    ? (pickLocalizedObjectArray(destDoc, 'gettingThere', language) as GettingThereItem[])
    : [];
  const localizedPricingGuide = destDoc
    ? (pickLocalizedObjectArray(destDoc, 'pricingGuide', language) as PricingItem[])
    : [];
  const localizedPackingGuide = destDoc
    ? pickLocalizedPackingGuide(
        {
          ...destDoc,
          packingGuide:
            destDoc.packingGuide ??
            destDoc.packingGuige ??
            (destination as Record<string, unknown>).packingGuide,
          packingGuide_en:
            destDoc.packingGuide_en ??
            destDoc.packingGuige_en ??
            (destination as Record<string, unknown>).packingGuide_en,
          packingSummary: destDoc.packingSummary ?? (destination as Record<string, unknown>).packingSummary,
          packingSummary_en: destDoc.packingSummary_en ?? (destination as Record<string, unknown>).packingSummary_en,
        },
        language
      )
    : null;

  const galleryImages = destination.galleryImages?.map(img => normalizeImage(img)) || [];

  return (
    <div className="bg-background-dark text-content font-display antialiased h-screen w-full overflow-y-auto no-scrollbar flex flex-col relative pb-32">
      <DestinationHero
        destination={destination}
        displayTitle={localizedTitle}
        displayLocation={localizedLocation}
        galleryImages={galleryImages}
        onBack={onBack}
        onShare={handleShare}
        onToggleFavorite={handleToggleFavorite}
        isSaved={isSaved}
        favLoading={favLoading}
        texts={texts}
      />

      <div className="relative z-10 bg-background-dark -mt-4 rounded-t-3xl border-t border-overlay/10 pb-32 shadow-[0_-5px_20px_rgba(0,0,0,0.2)]">
        <div className="w-full flex justify-center pt-3 pb-1">
          <div className="w-12 h-1.5 rounded-full bg-overlay/20"></div>
        </div>

        <DestinationActions
          onDownloadPdf={handleDownloadPdf}
          onOpenMap={handleOpenMap}
          pdfFile={destination.pdfFile}
          texts={texts}
        />

        <DestinationInfo
          description={localizedDescription}
          stats={destination.stats}
          aiTip={localizedAiTip}
          isExpanded={isExpanded}
          setIsExpanded={setIsExpanded}
          texts={texts}
        />

        <DestinationGettingThere
          gettingThere={localizedGettingThere}
          texts={texts}
        />

        <DestinationActivities
          activities={localizedActivities}
          completedActivities={completedActivities}
          onToggleActivity={handleToggleActivity}
          texts={texts}
        />

        <DestinationGallery
          galleryImages={galleryImages}
          heroImage={normalizeImage(destination.heroImage)}
          expandedIdx={expandedIdx}
          setExpandedIdx={setExpandedIdx}
          texts={texts}
        />

        {localizedPackingGuide && (
          <DestinationPacking packingGuide={localizedPackingGuide} />
        )}

        <DestinationPricing
          pricingGuide={localizedPricingGuide}
        />

        {/* CROSS-LINKED CAROUSELS */}
        <div className="mt-8 space-y-8 px-4 shrink-0 pb-10">
          {/* 1. Dónde dormir (Refugios) */}
          {lodgingResults.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-content flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">home_work</span>
                {t('common.whereToStay')}
              </h3>
              <div className="flex overflow-x-auto no-scrollbar gap-4 pb-2">
                {lodgingResults.map((ref) => {
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

          {/* 2. Ferias y Festivales (Eventos) */}
          {eventResults.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-content flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">celebration</span>
                {t('common.fairsFestivals')}
              </h3>
              <div className="flex overflow-x-auto no-scrollbar gap-4 pb-2">
                {eventResults.map((evt) => {
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

          {/* 3. Descuentos locales (Cupones) */}
          {couponResults.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-content flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">local_activity</span>
                {t('common.localDiscounts')}
              </h3>
              <div className="flex overflow-x-auto no-scrollbar gap-4 pb-2">
                {couponResults.map((coupon) => {
                  const cpImage = normalizeImage(coupon.image);
                  const canRedeem = !coupon.isPremium || isPremium;
                  return (
                    <div
                      key={coupon.id}
                      onClick={canRedeem ? () => navigate(`/coupons/${coupon.id}`) : () => navigate('/premium')}
                      className="relative flex-none w-60 bg-surface-dark border border-overlay/5 rounded-2xl overflow-hidden p-3 shadow-md group cursor-pointer"
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
        </div>
      </div>
    </div>
  );
};
