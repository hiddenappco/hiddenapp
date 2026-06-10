import React, { useState } from 'react';
import { Language } from '../types/core';
import { useEvents, useIsFavorite, toggleFavorite } from '../hooks/useFirestore';
import { useAuth } from './layout/AuthProvider';
import { useTranslation } from '../hooks/useTranslation';

interface FairsCalendarProps {
  language: Language;
  onMenuClick: () => void;
  onFairClick: (fairId: string) => void;
}

export const FairsCalendar: React.FC<FairsCalendarProps> = ({
  language,
  onMenuClick,
  onFairClick
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: events, loading } = useEvents();

  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const monthKeys = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'] as const;
  const months: Record<(typeof monthKeys)[number], string> = {
    jan: t('fairCalendar.monthJan'),
    feb: t('fairCalendar.monthFeb'),
    mar: t('fairCalendar.monthMar'),
    apr: t('fairCalendar.monthApr'),
    may: t('fairCalendar.monthMay'),
    jun: t('fairCalendar.monthJun'),
    jul: t('fairCalendar.monthJul'),
    aug: t('fairCalendar.monthAug'),
    sep: t('fairCalendar.monthSep'),
    oct: t('fairCalendar.monthOct'),
    nov: t('fairCalendar.monthNov'),
    dec: t('fairCalendar.monthDec'),
  };

  // Filter logic
  const monthMap: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
  };

  // Filter logic
  const filteredEvents = React.useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Start of today

    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(now.getFullYear() + 1);

    // Helper to parse DD/MM/YYYY
    const parseDate = (dStr: string) => {
      if (!dStr || !dStr.includes('/')) return new Date(8640000000000000); // Far future
      const [d, m, y] = dStr.split('/').map(Number);
      return new Date(y, m - 1, d);
    };

    let result = events
      .map(event => ({
        ...event,
        _parsedDate: parseDate(event.beginningDate || event.date)
      }))
      .filter(event => {
        // 1. Time range (Today -> 1 Year)
        if (event._parsedDate < now) return false;
        if (event._parsedDate > oneYearFromNow) return false;

        // 2. Search Term Filter
        if (searchTerm) {
          const search = searchTerm.toLowerCase();
          const matchesName = (event.name || "").toLowerCase().includes(search);
          const matchesLocation = (event.location || "").toLowerCase().includes(search);
          const matchesDept = (event.departmentId || "").toLowerCase().includes(search);
          const matchesSubtitle = (event.subtitle || "").toLowerCase().includes(search);
          const matchesDesc = (event.description || "").toLowerCase().includes(search);

          if (!matchesName && !matchesLocation && !matchesDept && !matchesSubtitle && !matchesDesc) return false;
        }

        // 3. Month Filter
        if (selectedMonth) {
          const targetMonth = monthMap[selectedMonth];
          const dateToUse = event.beginningDate || event.date;
          if (!dateToUse || !dateToUse.includes('/')) return false;
          const monthPart = dateToUse.split('/')[1];
          if (monthPart !== targetMonth) return false;
        }

        return true;
      })
      .sort((a, b) => a._parsedDate.getTime() - b._parsedDate.getTime());

    // Limit to 10 consecutive fairs
    return result.slice(0, 10);
  }, [events, searchTerm, selectedMonth]);

  const monthKeysList = monthKeys;

  return (
    <div className="bg-background-dark text-content font-display h-screen w-full flex flex-col antialiased selection:bg-primary selection:text-white overflow-hidden">

      {/* Header */}
      <header className="sticky top-0 z-50 bg-background-dark/95 backdrop-blur-md border-b border-overlay/5 transition-colors duration-300 shrink-0">
        <div className="flex items-center justify-between px-4 pt-safe pb-3 h-auto min-h-[4rem]">
          <button
            onClick={onMenuClick}
            className="flex size-10 items-center justify-center rounded-full text-content-secondary dark:text-white bg-surface-dark dark:bg-secondary hover:bg-overlay/10 dark:hover:bg-secondary/90 shadow-sm border border-overlay/10 transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-[20px]">menu</span>
          </button>
          <h1 className="text-lg font-bold tracking-tight text-center flex-1 text-content px-2">{t('fairCalendar.title')}</h1>
          <div className="flex items-center justify-center w-10 h-10">
            <img src="/assets/ui/logo.png" alt="Hidden Logo" className="w-8 h-8 object-contain" />
          </div>
        </div>
      </header>

      {/* Main Content Scrollable */}
      <main className="flex-1 w-full overflow-y-auto no-scrollbar pb-24">

        {/* Search and Filters Container */}
        <div className="px-4 py-6 space-y-4">

          {/* Search Bar */}
          <div className="relative group">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-content-muted group-focus-within:text-primary transition-colors">
              search
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('fairCalendar.searchPlaceholder')}
              className="w-full h-12 pl-12 pr-4 bg-surface-dark border border-overlay/10 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-content-muted"
            />
          </div>

          {/* Month Chips */}
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 mask-linear-fade">
            {Object.entries(months).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setSelectedMonth(selectedMonth === key ? null : key)}
                className={`flex-none px-4 py-2 rounded-full border font-medium text-sm transition-colors active:scale-95 ${selectedMonth === key ? 'bg-primary text-white border-primary' : 'bg-surface-dark border-overlay/10 text-content-secondary hover:border-primary hover:text-primary'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div className="px-4">
          <h3 className="text-xs font-bold text-content-subtle dark:text-content-muted uppercase tracking-wider mb-4 pl-1">{t('fairCalendar.upcoming')}</h3>

          {loading ? (
            <div className="text-center py-10 text-content-subtle">{t('fairCalendar.loading')}</div>
          ) : (
            <div className="flex flex-col relative">
              {/* Timeline Vertical Line */}
              <div className="absolute left-[23px] top-4 bottom-0 w-[2px] bg-overlay/10 z-0"></div>

              {filteredEvents.map((event) => {
                const dateToParse = event.beginningDate || event.date;
                const dateParts = dateToParse && dateToParse.includes('/') ? dateToParse.split('/') : null;
                const day = dateParts ? dateParts[0] : '??';
                const monthPart = dateParts ? dateParts[1] : null;
                const monthKey = monthPart ? monthKeysList[parseInt(monthPart) - 1] : 'jan';
                const monthAbbr = months[monthKey] || 'JAN';

                return (
                  <div
                    key={event.id}
                    className="relative z-10 grid grid-cols-[48px_1fr] gap-4 mb-8 group cursor-pointer"
                    onClick={() => onFairClick(event.id)}
                  >
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-xl bg-primary shadow-lg shadow-primary/20 flex flex-col items-center justify-center text-white border-2 border-background-dark group-hover:scale-105 transition-transform">
                        <span className="text-[10px] font-bold uppercase leading-none opacity-90">{monthAbbr}</span>
                        <span className="text-xl font-bold leading-none">{day}</span>
                      </div>
                    </div>
                    <div className="bg-surface-dark p-4 rounded-2xl border border-overlay/5 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-lg font-bold text-content leading-tight">{event.name}</h4>
                            {event.priceType && (
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${event.priceType === 'Gratuito'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                }`}>
                                {event.priceType}
                              </span>
                            )}
                          </div>
                          {event.subtitle && (
                            <p className="text-xs text-content-subtle dark:text-content-muted italic mb-2 line-clamp-1">"{event.subtitle}"</p>
                          )}
                          <div className="flex items-center gap-1.5 text-content-subtle dark:text-content-muted text-sm mb-2">
                            <span className="material-symbols-outlined text-[16px] text-accent">location_on</span>
                            <span>{event.location}</span>
                          </div>
                        </div>
                      </div>
                      {event.image && (
                        <div className="relative w-full h-32 mt-2 rounded-lg overflow-hidden bg-overlay/10">
                          <img
                            src={event.image}
                            alt={event.name}
                            className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                          />
                        </div>
                      )}

                      <FavoriteButton item={event} userId={user?.uid} type="fair" />
                    </div>
                  </div>
                );
              })}

              {/* Line Ending */}
              <div className="absolute left-[23px] bottom-0 h-16 w-[2px] bg-gradient-to-b from-overlay/10 to-transparent z-0"></div>
            </div>
          )}

          {!loading && filteredEvents.length === 0 && (
            <div className="text-center py-20 opacity-50">
              <span className="material-symbols-outlined text-4xl mb-2">event_busy</span>
              <p>{t('fairCalendar.noResults')}</p>
            </div>
          )}
        </div>
      </main>


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
      const itemData = type === 'fair' ? {
        name: item.name,
        image: item.image,
        location: item.location,
        date: item.date
      } : {};
      await toggleFavorite(userId, item.id, type, itemData);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`absolute top-4 right-4 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-black/20 backdrop-blur-md text-white border border-overlay/20 hover:bg-black/40 transition-colors shadow-sm`}
    >
      <span className={`material-symbols-outlined text-[18px] ${isSaved ? 'text-red-500 filled-icon' : 'text-white'}`}>
        favorite
      </span>
    </button>
  );
};