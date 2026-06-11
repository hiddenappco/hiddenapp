import React, { useMemo } from 'react';
import { Language } from '../types/core';
import { useParams } from 'react-router-dom';
import { useDepartment, useDestinations, useIsFavorite, toggleFavorite } from '../hooks/useFirestore';
import { useAuth } from './layout/AuthProvider';
import { normalizeImage } from '../utils/imageHelpers';
import { normalizeListValue } from '../utils/departmentContent';
import { formatDepartmentStatValue } from '../utils/departmentIdentity';
import { useTranslation } from '../hooks/useTranslation';
import { RichTextContent } from './ui/RichTextContent';

interface DepartmentBriefingProps {
  language: Language;
  onBack: () => void;
  onMoreInfo: (id: string) => void;
  onDestinationClick: (id: string) => void;
  departmentId?: string;
}

export const DepartmentBriefing: React.FC<DepartmentBriefingProps> = ({
  onBack,
  onMoreInfo,
  onDestinationClick,
  departmentId: propId
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const finalId = propId || id;

  const { data, loading } = useDepartment(finalId);
  const effectiveDeptId = data?.departmentId || finalId;
  const { data: destinations } = useDestinations(effectiveDeptId);

  const heroImage = data ? normalizeImage(data.heroImage) : '';

  const ecosystemItems = useMemo(
    () => (data?.ecosystems ? normalizeListValue(data.ecosystems) : []),
    [data]
  );
  const gastronomyItems = useMemo(
    () => (data?.mustTryGastronomy ? normalizeListValue(data.mustTryGastronomy) : []),
    [data]
  );
  const tipItems = useMemo(
    () => (data?.tips ? normalizeListValue(data.tips) : []),
    [data]
  );

  if (loading) return <div className="h-screen w-full flex items-center justify-center bg-background-dark text-content">{t('department.loading')}</div>;
  if (!data) return <div className="h-screen w-full flex items-center justify-center bg-background-dark text-content">{t('department.notFound')}</div>;

  return (
    <div className="relative flex h-screen w-full flex-col overflow-y-auto overflow-x-hidden pb-6 bg-background-dark font-display text-content antialiased selection:bg-primary selection:text-white no-scrollbar">
      <div className="relative w-full h-[60vh] shrink-0">
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 pb-4 pt-safe-hero">
          <button
            onClick={onBack}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/20 backdrop-blur-md text-white hover:bg-black/40 transition-colors"
          >
            <span className="material-symbols-outlined text-[24px]">arrow_back</span>
          </button>
        </div>

        <div
          className="absolute inset-0 w-full h-full bg-center bg-cover bg-no-repeat"
          aria-label={data.name}
          style={{ backgroundImage: `url("${heroImage}")` }}
        >
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-background-dark"></div>

        <div className="absolute bottom-0 left-0 w-full p-6 pb-8 z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center rounded-full bg-accent text-white px-3 py-1 text-xs font-bold shadow-lg backdrop-blur-sm border border-overlay/10">
              {data.tag}
            </span>
            <span className="inline-flex items-center rounded-full bg-overlay/10 px-2.5 py-0.5 text-xs font-medium text-content backdrop-blur-sm border border-overlay/10">
              <span className="material-symbols-outlined text-[14px] mr-1">location_on</span>
              {data.locationLabel}
            </span>
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight text-content mb-1 shadow-sm drop-shadow-md">{data.name}</h1>
          <p className="text-content/90 text-lg font-medium drop-shadow-sm">{data.subtitle}</p>
        </div>
      </div>

      <div className="relative z-10 -mt-6 rounded-t-3xl bg-background-dark px-6 pt-8 pb-32">
        {data.description && (
          <div className="mb-8">
            <RichTextContent content={data.description} />
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 mb-6">
          <div className="flex items-center gap-2.5 rounded-xl border border-overlay/10 bg-surface-dark px-3 py-2.5 shadow-sm">
            <span className="material-symbols-outlined text-primary text-[20px] shrink-0">thermostat</span>
            <div className="min-w-0">
              <p className="text-base font-bold text-content leading-tight truncate">
                {formatDepartmentStatValue(data.temp)}
              </p>
              <p className="text-[11px] text-content-muted leading-tight">{t('common.average')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 rounded-xl border border-overlay/10 bg-surface-dark px-3 py-2.5 shadow-sm">
            <span className="material-symbols-outlined text-primary text-[20px] shrink-0">water_drop</span>
            <div className="min-w-0">
              <p className="text-base font-bold text-content leading-tight truncate">
                {formatDepartmentStatValue(data.humidity)}
              </p>
              <p className="text-[11px] text-content-muted leading-tight">{t('common.humidity')}</p>
            </div>
          </div>
        </div>

        {data.safetyNote && (
          <div className="mb-8 p-4 rounded-xl bg-blue-500/10 dark:bg-blue-900/20 border border-blue-500/20 flex gap-4">
            <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 shrink-0">health_and_safety</span>
            <div>
              <h4 className="text-blue-800 dark:text-blue-200 font-bold text-sm mb-1">{t('department.safety')}</h4>
              <RichTextContent content={data.safetyNote} compact />
            </div>
          </div>
        )}

        {(data.logistics || data.seasonality) && (
          <div className="flex flex-col gap-4 mb-8 mobile-single-col">
            {data.logistics && (
              <div className="min-w-0 p-5 rounded-2xl bg-surface-dark border border-overlay/10 shadow-sm flex flex-col gap-2">
                <div className="flex items-center gap-2 text-orange-500 dark:text-orange-400">
                  <span className="material-symbols-outlined shrink-0">route</span>
                  <h4 className="font-bold leading-snug">{t('department.logistics')}</h4>
                </div>
                <div className="min-w-0 break-words">
                  <RichTextContent content={data.logistics} compact />
                </div>
              </div>
            )}
            {data.seasonality && (
              <div className="min-w-0 p-5 rounded-2xl bg-surface-dark border border-overlay/10 shadow-sm flex flex-col gap-2">
                <div className="flex items-center gap-2 text-emerald-500 dark:text-emerald-400">
                  <span className="material-symbols-outlined shrink-0">calendar_month</span>
                  <h4 className="font-bold leading-snug">{t('department.seasonality')}</h4>
                </div>
                <div className="min-w-0 break-words">
                  <RichTextContent content={data.seasonality} compact />
                </div>
              </div>
            )}
          </div>
        )}

        {ecosystemItems.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xl font-bold text-content mb-4">{t('department.ecosystems')}</h3>
            <div className="flex flex-wrap gap-2">
              {ecosystemItems.map((eco, index) => (
                <span
                  key={`${eco.label}-${index}`}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 text-sm font-medium flex items-center gap-1.5 shadow-sm max-w-full"
                  title={eco.description}
                >
                  <span className="material-symbols-outlined text-[16px] shrink-0">eco</span>
                  <span className="line-clamp-2">{eco.label}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {gastronomyItems.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xl font-bold text-content mb-4">{t('department.gastronomy')}</h3>
            <div className="flex overflow-x-auto gap-4 no-scrollbar -mx-6 px-6 pb-2 snap-x snap-mandatory scroll-px-6">
              {gastronomyItems.map((food, index) => (
                <article
                  key={`${food.label}-${index}`}
                  className="w-[min(85vw,300px)] shrink-0 snap-start flex flex-col rounded-2xl bg-surface-dark border border-overlay/10 shadow-md overflow-hidden"
                >
                  <div className="flex items-center gap-3 p-4 pb-3 border-b border-overlay/5 bg-orange-500/5">
                    <div className="w-11 h-11 rounded-full bg-orange-500/15 text-orange-500 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[22px]">restaurant</span>
                    </div>
                    <h4 className="text-content font-bold text-sm leading-snug flex-1 min-w-0">
                      {food.label}
                    </h4>
                  </div>
                  {food.description && (
                    <p className="text-content-secondary text-sm leading-relaxed p-4 pt-3 whitespace-normal break-words">
                      {food.description}
                    </p>
                  )}
                </article>
              ))}
            </div>
          </div>
        )}

        {tipItems.length > 0 && (
          <div className="mb-10 p-5 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent border border-primary/20 shadow-sm relative overflow-hidden">
            <div className="absolute -top-6 -right-6 text-primary/5">
                <span className="material-symbols-outlined text-[100px]">lightbulb</span>
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-primary text-[24px]">lightbulb</span>
                <h3 className="text-lg font-bold text-content">{t('department.tips')}</h3>
              </div>
              <ul className="flex flex-col gap-3">
                {tipItems.map((tip, index) => (
                  <li
                    key={`${tip.label}-${index}`}
                    className="flex gap-3 items-start bg-surface-dark/50 p-3 rounded-xl border border-overlay/5"
                  >
                    <span className="material-symbols-outlined text-primary text-[20px] shrink-0 mt-0.5">check_circle</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-content-secondary text-sm leading-relaxed font-medium">{tip.label}</p>
                      {tip.description && tip.description !== tip.label && (
                        <p className="text-content-subtle text-xs leading-relaxed mt-1">{tip.description}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="mb-24">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-content">{t('department.highlights')}</h3>
            <button className="text-sm font-semibold text-primary hover:text-orange-600 transition-colors">{t('department.seeAll')}</button>
          </div>

          <div className="flex overflow-x-auto gap-4 no-scrollbar -mx-6 px-6 pb-4">
            {destinations.length > 0 ? (
              [...destinations]
                .sort(() => 0.5 - Math.random())
                .slice(0, 6)
                .map(dest => (
                  <div
                    key={dest.id}
                    onClick={() => onDestinationClick(dest.id)}
                    className="min-w-[160px] h-[220px] relative rounded-xl overflow-hidden shadow-lg border border-overlay/10 cursor-pointer hover:scale-[1.02] transition-transform group"
                  >
                    <div className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110" style={{ backgroundImage: `url("${dest.heroImage}")` }}></div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>

                    {dest.verified && (
                      <div className="absolute top-2 left-2 bg-blue-500/80 backdrop-blur-sm p-1 rounded-full border border-blue-400/30 shadow-sm z-10">
                        <span className="material-symbols-outlined text-white text-[14px]">verified</span>
                      </div>
                    )}

                    <FavoriteButton item={dest} userId={user?.uid} type="destination" />

                    <div className="absolute bottom-3 left-3 right-3 text-white">
                      <p className="font-bold text-sm leading-tight drop-shadow-md line-clamp-2">{dest.title}</p>
                      <div className="flex items-center gap-1 mt-1 opacity-80">
                        <span className="material-symbols-outlined text-[12px] text-primary shrink-0">location_on</span>
                        <span className="text-[10px] font-medium truncate leading-none">{dest.location}</span>
                      </div>
                    </div>
                  </div>
                ))
            ) : (
              <div className="p-4 w-full text-center text-content-subtle text-sm border border-overlay/10 rounded-xl border-dashed">
                {t('department.noDestinations')}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background-dark via-background-dark to-transparent pt-12 pb-safe z-30">
        <button
          onClick={() => onMoreInfo(effectiveDeptId || '')}
          className="w-full bg-gradient-to-r from-primary to-[#E05D2B] hover:opacity-90 active:scale-[0.98] transition-all text-white font-bold text-lg py-4 px-6 rounded-xl shadow-xl shadow-primary/30 flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined filled-icon">support_agent</span>
          {t('department.cta')}
        </button>
      </div>
    </div>
  );
};

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
      const itemData = type === 'destination' ? {
        title: item.title,
        heroImage: item.heroImage,
        location: item.location
      } : type === 'coupon' ? {
        title: item.title,
        image: item.image,
        location: item.location,
        discount: item.discount,
        category: item.category
      } : {
        name: item.name,
        image: item.image,
        location: item.location,
        date: item.date
      };
      await toggleFavorite(userId, item.id, type, itemData);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className="absolute top-2 right-2 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-black/20 backdrop-blur-md text-white border border-overlay/20 hover:bg-black/40 transition-colors"
    >
      <span className={`material-symbols-outlined text-[18px] ${isSaved ? 'text-red-500 filled-icon' : 'text-white'}`}>
        favorite
      </span>
    </button>
  );
};
