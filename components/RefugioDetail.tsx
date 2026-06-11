import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Language } from '../types/core';
import { useRefugio, useIsFavorite, toggleFavorite, useCoupons, useDestinations, useEvents, useRefugios } from '../hooks/useFirestore';
import { useAuth } from './layout/AuthProvider';
import { useRevenueCat } from './layout/RevenueCatProvider';
import { normalizeImage } from '../utils/imageHelpers';
import { useTranslation } from '../hooks/useTranslation';
import { Browser } from '@capacitor/browser';

interface RefugioDetailProps {
  language: Language;
  onBack: () => void;
  refugioId?: string;
}

export const RefugioDetail: React.FC<RefugioDetailProps> = ({
  onBack,
  refugioId: propId
}) => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const finalId = id || propId;
  const navigate = useNavigate();

  const { user } = useAuth();
  const { isPremium } = useRevenueCat();

  const { data: refugio, loading } = useRefugio(finalId);
  const { data: coupons } = useCoupons();
  const { data: destinations } = useDestinations();
  const { data: events } = useEvents();
  const { data: allRefugios } = useRefugios();
  
  const { isSaved } = useIsFavorite(user?.uid, finalId, 'refugio');
  const [favLoading, setFavLoading] = useState(false);

  const pricingData = useMemo(() => {
    if (!refugio?.pricingGuide) return null;
    if (typeof refugio.pricingGuide === 'object') return refugio.pricingGuide;
    try {
      return JSON.parse(refugio.pricingGuide);
    } catch (e) {
      return null;
    }
  }, [refugio?.pricingGuide]);

  const activitiesData = useMemo(() => {
    if (!refugio?.activities) return [];
    if (Array.isArray(refugio.activities)) return refugio.activities;
    try {
      return typeof refugio.activities === 'string' ? JSON.parse(refugio.activities) : [];
    } catch (e) {
      return [];
    }
  }, [refugio?.activities]);

  const restrictionsData = useMemo(() => {
    if (!refugio?.restrictions) return [];
    if (Array.isArray(refugio.restrictions)) return refugio.restrictions;
    try {
      return typeof refugio.restrictions === 'string' ? JSON.parse(refugio.restrictions) : [];
    } catch (e) {
      return [];
    }
  }, [refugio?.restrictions]);

  const checkData = useMemo(() => {
    if (!refugio?.checkInCheckOut) return null;
    if (typeof refugio.checkInCheckOut === 'object') return refugio.checkInCheckOut;
    try {
      return JSON.parse(refugio.checkInCheckOut);
    } catch (e) {
      return null;
    }
  }, [refugio?.checkInCheckOut]);

  const handleToggleFavorite = async () => {
    if (!user) {
      alert(t('common.loginSaveFavorites'));
      return;
    }
    if (!finalId || !refugio) return;
    try {
      setFavLoading(true);
      await toggleFavorite(user.uid, finalId, 'refugio', {
        name: refugio.name,
        heroImage: refugio.heroImage,
        location: refugio.location,
        tagline: refugio.tagline,
        type: refugio.type
      });
    } catch (err) {
      console.error("Error toggling favorite:", err);
    } finally {
      setFavLoading(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share && refugio) {
      try {
        await navigator.share({
          title: refugio.name,
          text: refugio.tagline,
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
    if (!refugio) return;
    const url = refugio.coordinates
      ? `https://www.google.com/maps/search/?api=1&query=${refugio.coordinates.lat},${refugio.coordinates.lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(refugio.location + " " + refugio.name)}`;
    await Browser.open({ url });
  };

  const handleOpenBookingLink = async () => {
    if (refugio?.bookingLink) {
      await Browser.open({ url: refugio.bookingLink });
    }
  };

  const handleOpenWhatsApp = async () => {
    if (refugio?.whatsapp) {
      await Browser.open({ url: refugio.whatsapp });
    }
  };

  const linkedDestinations = useMemo(() => {
    if (!refugio || !refugio.destinationId || !destinations) return [];
    return destinations.filter(d => 
      refugio.destinationId.includes(d.id) ||
      (d.customId && refugio.destinationId.includes(d.customId))
    );
  }, [refugio, destinations]);

  const linkedCoupons = React.useMemo(() => {
    if (!refugio || !refugio.destinationId || !coupons) return [];
    return coupons.filter(c => {
      if (!c.destinationId) return false;
      return refugio.destinationId.includes(c.destinationId) ||
        linkedDestinations.some(d => c.destinationId === d.id || c.destinationId === d.customId);
    });
  }, [refugio, coupons, linkedDestinations]);

  const linkedEvents = useMemo(() => {
    if (!refugio || !refugio.destinationId || !events) return [];
    return events.filter(e => 
      e.destinationId && (
        refugio.destinationId.includes(e.destinationId) ||
        linkedDestinations.some(d => e.destinationId === d.id || e.destinationId === d.customId)
      )
    );
  }, [refugio, events, linkedDestinations]);

  const linkedRefugios = useMemo(() => {
    if (!refugio || !refugio.destinationId || !allRefugios) return [];
    return allRefugios.filter(r => 
      r.id !== refugio.id && 
      r.destinationId?.some(id => 
        refugio.destinationId.includes(id) ||
        linkedDestinations.some(d => d.id === id || d.customId === id)
      )
    );
  }, [refugio, allRefugios, linkedDestinations]);

  if (loading) return <div className="h-screen w-full flex items-center justify-center bg-background-dark text-content-subtle">{t('refugio.loading')}</div>;
  if (!refugio) return <div className="h-screen w-full flex items-center justify-center bg-background-dark text-content-subtle">{t('refugio.notFound')}</div>;

  const displayName = refugio.name;
  const displayTagline = refugio.tagline;
  const displayDescription = refugio.description || '';
  const displayHowToBook = refugio.howToBook || '';

  const galleryImages = refugio.gallery?.map(img => normalizeImage(img)) || [];
  const heroImage = normalizeImage(refugio.heroImage);

  return (
    <div className="bg-background-dark font-display antialiased relative flex h-screen w-full flex-col overflow-y-auto overflow-x-hidden pb-safe no-scrollbar">
      <div className="sticky top-0 z-50 flex items-center bg-surface-dark p-4 pt-safe justify-between border-b border-overlay/10 transition-colors">
        <button
          onClick={onBack}
          className="text-content flex size-10 shrink-0 items-center justify-center cursor-pointer rounded-full hover:bg-overlay/5 transition-colors"
        >
          <span className="material-symbols-outlined text-2xl">arrow_back</span>
        </button>
        <h2 className="text-content text-lg font-bold leading-tight tracking-tight flex-1 text-center truncate px-2">
          {displayName}
        </h2>
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={handleShare}
            className="flex items-center justify-center rounded-full hover:bg-overlay/5 transition-colors size-10 text-content"
          >
            <span className="material-symbols-outlined text-2xl">share</span>
          </button>
          <button
            onClick={handleToggleFavorite}
            disabled={favLoading}
            className="flex items-center justify-center rounded-full hover:bg-overlay/5 transition-colors size-10 active:scale-90"
          >
            <span className={`material-symbols-outlined text-2xl transition-all ${isSaved ? 'filled-icon text-red-500' : 'text-content'}`}>favorite</span>
          </button>
        </div>
      </div>

      <div className="w-full pt-4 pb-2 px-4 shrink-0">
        <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 no-scrollbar pb-2">
          {galleryImages.length > 0 ? (
            galleryImages.map((img, index) => (
              <div key={index} className="shrink-0 w-[85vw] h-72 bg-overlay/5 rounded-2xl overflow-hidden relative shadow-md group snap-center">
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                  style={{ backgroundImage: `url("${img}")` }}
                ></div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent"></div>
              </div>
            ))
          ) : (
            <div className="shrink-0 w-full h-72 bg-overlay/5 rounded-2xl overflow-hidden relative shadow-md group">
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                style={{ backgroundImage: `url("${heroImage}")` }}
              ></div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent"></div>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 flex flex-col gap-1.5 shrink-0">
        <div className="flex flex-wrap gap-1.5">
          {refugio.type?.map((typeLabel, idx) => (
            <span key={idx} className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
              {typeLabel}
            </span>
          ))}
        </div>
        <h1 className="text-content tracking-tight text-3xl font-extrabold leading-tight mt-1">{displayName}</h1>
        <p className="text-content-secondary font-medium text-sm leading-snug italic">{displayTagline}</p>
        <div className="flex items-center gap-1.5 text-content-subtle mt-1.5">
          <span className="material-symbols-outlined text-lg text-primary">location_on</span>
          <p className="text-xs font-semibold">{refugio.location}</p>
        </div>
      </div>

      <div className="h-px w-full bg-overlay/10 my-4 shrink-0"></div>

      <div className="px-4 py-1 shrink-0">
        <h3 className="text-lg font-bold text-content mb-2">{t('refugio.about')}</h3>
        <div 
          className="text-content-secondary text-sm leading-relaxed"
          dangerouslySetInnerHTML={{ __html: displayDescription }}
        />
      </div>

      {refugio.amenities && refugio.amenities.length > 0 && (
        <div className="px-4 py-3 shrink-0">
          <h3 className="text-lg font-bold text-content mb-3">{t('refugio.amenities')}</h3>
          <div className="grid grid-cols-2 gap-2">
            {refugio.amenities.map((amenity, idx) => (
              <div key={idx} className="flex items-center gap-2 p-2.5 rounded-xl bg-surface-dark border border-overlay/5">
                <span className="material-symbols-outlined text-primary text-lg">
                  {getAmenityIcon(amenity)}
                </span>
                <span className="text-xs text-content-secondary font-bold truncate">{amenity}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {refugio.pricingGuide && (
        <div className="px-4 py-3 shrink-0">
          <h3 className="text-lg font-bold text-content mb-2">{t('refugio.pricing')}</h3>
          <div className="bg-surface-dark border border-overlay/5 rounded-2xl p-4">
            {pricingData && pricingData.desglose_tarifas ? (
              <div className="flex flex-col gap-4">
                {(pricingData.precio_minimo || pricingData.precio_maximo) && (
                  <div className="flex justify-between items-center pb-3 border-b border-overlay/10">
                    <span className="text-xs text-content-subtle font-bold uppercase tracking-wider">
                      {t('refugio.ratesRange')}
                    </span>
                    <span className="text-sm font-extrabold text-primary">
                      {pricingData.precio_minimo ? `$${pricingData.precio_minimo.toLocaleString()}` : ''}
                      {pricingData.precio_minimo && pricingData.precio_maximo ? ' - ' : ''}
                      {pricingData.precio_maximo ? `$${pricingData.precio_maximo.toLocaleString()}` : ''} {pricingData.moneda || 'COP'}
                    </span>
                  </div>
                )}
                <div className="space-y-4">
                  {pricingData.desglose_tarifas.map((item: any, idx: number) => (
                    <div key={idx} className="flex flex-col gap-1 pb-3 border-b border-overlay/5 last:border-0 last:pb-0">
                      <div className="flex justify-between items-start gap-2">
                        <p className="text-sm font-bold text-content leading-snug">{item.acomodacion}</p>
                        <p className="text-sm font-extrabold text-primary shrink-0">
                          ${item.valor_noche ? item.valor_noche.toLocaleString() : '--'} {pricingData.moneda || 'COP'}
                        </p>
                      </div>
                      {item.incluye && (
                        <p className="text-xs text-content-secondary leading-normal">
                          <span className="font-semibold text-content-subtle">{t('refugio.includes')}</span>
                          {item.incluye}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
                {pricingData.nota_precio && (
                  <p className="text-xs text-content-subtle italic leading-relaxed pt-2 border-t border-overlay/10">
                    {pricingData.nota_precio}
                  </p>
                )}
              </div>
            ) : Array.isArray(pricingData) ? (
              <div className="space-y-3">
                {pricingData.map((p: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center pb-2 border-b border-overlay/5 last:border-0 last:pb-0">
                    <div>
                      <p className="text-sm font-bold text-content leading-tight">{p.categoria || p.type || p.nombre || 'Hospedaje'}</p>
                      {p.nota && <p className="text-[10px] text-content-muted mt-0.5">{p.nota}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-extrabold text-primary">
                        {p.precio ? `$${p.precio}` : (p.precio_min && p.precio_max ? `$${p.precio_min} - $${p.precio_max}` : `$${p.precio_min || p.precio_max || 'Consultar'}`)}
                      </p>
                      <p className="text-[9px] text-content-subtle font-medium">{p.unidad || 'por noche'}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : typeof refugio.pricingGuide === 'string' ? (
              <p className="text-sm text-content-secondary leading-relaxed">{refugio.pricingGuide}</p>
            ) : (
              <pre className="text-xs text-content-secondary overflow-x-auto whitespace-pre-wrap font-mono">
                {JSON.stringify(refugio.pricingGuide, null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}

      {refugio.activities && (
        <div className="px-4 py-3 shrink-0">
          <h3 className="text-lg font-bold text-content mb-2">{t('refugio.activities')}</h3>
          <div className="bg-surface-dark border border-overlay/5 rounded-2xl p-4">
            {activitiesData && activitiesData.length > 0 ? (
              <div className="space-y-4">
                {activitiesData.map((act: any, idx: number) => {
                  const isObj = typeof act === 'object' && act !== null;
                  const nombre = isObj ? (act.nombre || act.name) : act;
                  const descripcion = isObj ? (act.descripcion || act.description) : null;
                  const precio = isObj ? act.precio : null;

                  return (
                    <div key={idx} className="flex flex-col gap-1 pb-3 border-b border-overlay/5 last:border-0 last:pb-0">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-primary text-base shrink-0">directions_walk</span>
                          <p className="text-sm font-bold text-content leading-snug">{nombre}</p>
                        </div>
                        {precio !== undefined && precio !== null && (
                          <p className="text-xs font-extrabold text-primary shrink-0">
                            {precio === 0 || precio === '0' ? t('common.free') : `$${precio.toLocaleString()} COP`}
                          </p>
                        )}
                      </div>
                      {descripcion && (
                        <p className="text-xs text-content-secondary leading-relaxed pl-6">{descripcion}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : typeof refugio.activities === 'string' ? (
              <p className="text-sm text-content-secondary leading-relaxed">{refugio.activities}</p>
            ) : (
              <pre className="text-xs text-content-secondary overflow-x-auto whitespace-pre-wrap font-mono">
                {JSON.stringify(refugio.activities, null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}

      {refugio.restrictions && (
        <div className="px-4 py-3 shrink-0">
          <h3 className="text-lg font-bold text-content mb-2">{t('refugio.restrictions')}</h3>
          <div className="bg-surface-dark border border-overlay/5 rounded-2xl p-4">
            {restrictionsData && restrictionsData.length > 0 ? (
              <div className="space-y-4">
                {restrictionsData.map((item: any, idx: number) => {
                  const isObj = typeof item === 'object' && item !== null;
                  const icono = isObj ? item.icono : null;
                  const titulo = isObj ? (item.titulo || item.title) : null;
                  const detalle = isObj ? (item.detalle || item.detail || item.rule || item.regla || item.description) : item;

                  return (
                    <div key={idx} className="flex items-start gap-3 text-xs text-content-secondary leading-relaxed pb-3 border-b border-overlay/5 last:border-0 last:pb-0">
                      {icono ? (
                        <span className="text-lg shrink-0 mt-0.5 leading-none">{icono}</span>
                      ) : (
                        <span className="material-symbols-outlined text-amber-500 text-sm mt-0.5 shrink-0">warning</span>
                      )}
                      <div className="flex-1 min-w-0">
                        {titulo && <p className="font-bold text-content text-xs mb-0.5">{titulo}</p>}
                        <p className="font-medium text-content-secondary">{detalle}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : typeof refugio.restrictions === 'string' ? (
              <p className="text-sm text-content-secondary leading-relaxed">{refugio.restrictions}</p>
            ) : (
              <pre className="text-xs text-content-secondary overflow-x-auto whitespace-pre-wrap font-mono">
                {JSON.stringify(refugio.restrictions, null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}

      {checkData && (checkData.check_in || checkData.checkIn || checkData.check_out || checkData.checkOut) && (
        <div className="px-4 py-3 shrink-0">
          <h3 className="text-lg font-bold text-content mb-2">{t('refugio.checkTimes')}</h3>
          <div className="bg-surface-dark border border-overlay/5 rounded-2xl p-4 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col items-center justify-center gap-1 border-r border-overlay/10 pr-2">
                <div className="flex items-center gap-1.5 text-primary">
                  <span className="material-symbols-outlined text-base">login</span>
                  <span className="text-[10px] text-content-subtle uppercase tracking-wider font-bold">{t('refugio.checkIn')}</span>
                </div>
                <span className="text-base font-black text-content">{checkData.check_in || checkData.checkIn || '--:--'}</span>
              </div>
              <div className="flex flex-col items-center justify-center gap-1 pl-2">
                <div className="flex items-center gap-1.5 text-primary">
                  <span className="material-symbols-outlined text-base">logout</span>
                  <span className="text-[10px] text-content-subtle uppercase tracking-wider font-bold">{t('refugio.checkOut')}</span>
                </div>
                <span className="text-base font-black text-content">{checkData.check_out || checkData.checkOut || '--:--'}</span>
              </div>
            </div>
            {(checkData.instrucciones || checkData.instructions) && (
              <div className="mt-1 pt-3 border-t border-overlay/5 flex gap-2.5 items-start text-xs text-content-secondary leading-relaxed">
                <span className="material-symbols-outlined text-primary text-[18px] shrink-0 mt-0.5">info</span>
                <p className="font-medium text-left">{checkData.instrucciones || checkData.instructions}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {displayHowToBook && (
        <div className="px-4 py-3 shrink-0">
          <h3 className="text-lg font-bold text-content mb-2">{t('refugio.booking')}</h3>
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4">
            <div 
              className="text-xs text-content-secondary leading-relaxed font-medium"
              dangerouslySetInnerHTML={{ __html: displayHowToBook }}
            />
          </div>
        </div>
      )}

      <div className="px-4 py-3 shrink-0">
        <h3 className="text-lg font-bold text-content mb-3">{t('refugio.location')}</h3>
        <div className="relative w-full overflow-hidden rounded-2xl border border-overlay/10 bg-surface-dark shadow-sm group">
          <div
            className="absolute inset-0 opacity-[0.03] dark:opacity-[0.07] bg-cover bg-center grayscale pointer-events-none"
            style={{ backgroundImage: `url("${heroImage}")` }}
          ></div>
          <div className="relative p-5 flex flex-col gap-4">
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center size-11 rounded-xl bg-primary/10 text-primary shrink-0">
                <span className="material-symbols-outlined text-2xl">location_on</span>
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-content font-bold text-sm leading-tight">
                  {refugio.location}
                </p>
                <p className="text-content-muted text-[10px] font-bold uppercase tracking-wide">
                  {t('common.viewOnMaps')}
                </p>
              </div>
            </div>
            <button
              onClick={handleOpenMap}
              className="w-full bg-white dark:bg-secondary text-secondary dark:text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] hover:brightness-95 shadow-sm border border-overlay/5"
            >
              <span className="material-symbols-outlined text-lg">directions</span>
              {t('refugio.openMap')}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-8 space-y-8 px-4 shrink-0 pb-12">
        {linkedDestinations.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-content flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">explore</span>
              {t('destination.lodgingDestinations')}
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

        {linkedEvents.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-content flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">celebration</span>
              {t('destination.nearbyFairs')}
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

        {linkedRefugios.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-content flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">home_work</span>
              {t('destination.otherLodgings')}
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
              <h3 className="text-lg font-bold leading-tight text-content">{t('refugio.couponsInArea')}</h3>
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
      </div>

      {(refugio.whatsapp || refugio.bookingLink) && (
        <div className="px-4 mt-6 mb-2 shrink-0">
          <div className="bg-surface-dark border border-overlay/10 rounded-2xl shadow-lg p-4 flex gap-3">
            {refugio.whatsapp && (
              <button
                onClick={handleOpenWhatsApp}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-3.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow transition-all active:scale-[0.98]"
              >
                <span className="material-symbols-outlined text-lg">chat</span>
                {t('refugio.whatsapp')}
              </button>
            )}
            {refugio.bookingLink && (
              <button
                onClick={handleOpenBookingLink}
                className="flex-1 bg-primary hover:bg-primary/95 text-white font-extrabold py-3.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
              >
                <span className="material-symbols-outlined text-lg">calendar_month</span>
                {t('refugio.bookNow')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

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
