import React from 'react';
import { Language } from '../types/core';
import { Trip } from '../types/trips';
import { useTranslation } from '../hooks/useTranslation';
import { BOTTOM_NAV_SCROLL_PADDING } from '../utils/bottomNav';
import { PaywallRoiCard } from './trips/PaywallRoiCard';
import { TRIP_LEDGER_LIMITS } from '../config/constants';

const MAX_PAST_TRIPS = TRIP_LEDGER_LIMITS.MAX_PAST_TRIPS;

interface BudgetProps {
  language: Language;
  activeTrip: Trip | null;
  pastTrips: Trip[];
  onBack: () => void;
  onMenuClick: () => void;
  onCreateTrip: () => void;
  onJoinTrip: () => void;
  onOpenConverter: () => void;
  onOpenTrip: () => void;
  onOpenHistoryTrip: (trip: Trip) => void;
  onDeleteTrip: (tripId: string) => void;
  pendingSyncCount?: number;
  isOnline?: boolean;
}

export const Budget: React.FC<BudgetProps> = ({
  language,
  activeTrip,
  pastTrips,
  onBack,
  onMenuClick,
  onCreateTrip,
  onJoinTrip,
  onOpenConverter,
  onOpenTrip,
  onOpenHistoryTrip,
  onDeleteTrip,
  pendingSyncCount = 0,
  isOnline = true,
}) => {
  const { t } = useTranslation();

  const handleDeleteTrip = (e: React.MouseEvent, tripId: string) => {
    e.stopPropagation();
    if (window.confirm(t('budget.deleteConfirm'))) {
      onDeleteTrip(tripId);
    }
  };

  const calculateTotal = (trip: Trip) => {
    // Priority 1: Use the optimized totalSpent field
    let total = trip.totalSpent !== undefined ? trip.totalSpent : 0;

    // Priority 2: Fallback to manual calculation IF expenses array exists (optimistic)
    if (total === 0 && trip.expenses && trip.expenses.length > 0) {
      total = trip.expenses.reduce((acc: number, curr: any) => acc + curr.amount, 0);
    }

    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(total);
  }

  return (
    <div className="bg-background-dark font-display antialiased text-content h-screen w-full overflow-hidden flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center bg-background-dark/95 backdrop-blur-md px-4 pb-2 pt-safe justify-between border-b border-overlay/10 transition-colors">
        <div className="flex items-center gap-2">
          <button
            onClick={onMenuClick}
            className="flex items-center justify-center size-10 rounded-full text-content-secondary dark:text-white bg-surface-dark dark:bg-secondary hover:bg-overlay/10 dark:hover:bg-[#0a1f35] shadow-sm border border-overlay/10 transition-colors active:scale-95"
          >
            <span className="material-symbols-outlined text-2xl">menu</span>
          </button>
          <h2 className="text-content text-lg font-bold leading-tight tracking-tight">
            {t('budget.title')}
          </h2>
        </div>
        <img src="/assets/ui/logo.png" alt="Hidden Logo" className="h-8 object-contain" />
      </header>

      <main className={`flex-1 min-h-0 overflow-y-auto overflow-x-hidden no-scrollbar p-4 flex flex-col gap-6 ${BOTTOM_NAV_SCROLL_PADDING}`}>

        {(!isOnline || pendingSyncCount > 0) && (
          <div className={`px-4 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 ${
            isOnline ? 'bg-amber-500/10 border-amber-500/20 text-amber-300' : 'bg-blue-500/10 border-blue-500/20 text-blue-300'
          }`}>
            <span className="material-symbols-outlined text-base">{isOnline ? 'cloud_upload' : 'cloud_off'}</span>
            {!isOnline ? t('trips.offlineMode') : t('trips.pendingSync', { count: pendingSyncCount })}
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onOpenConverter}
            className="flex-1 min-w-0 flex items-center justify-center gap-1.5 h-11 rounded-xl bg-overlay/5 border border-overlay/10 text-[10px] sm:text-xs font-bold text-content-muted hover:border-budget-primary/30 transition-colors active:scale-[0.98] px-1"
          >
            <span className="material-symbols-outlined text-base text-budget-primary shrink-0">currency_exchange</span>
            <span className="truncate">{t('trips.converterLink')}</span>
          </button>
          <button
            type="button"
            onClick={onJoinTrip}
            className="flex-1 min-w-0 flex items-center justify-center gap-1.5 h-11 rounded-xl bg-overlay/5 border border-overlay/10 text-[10px] sm:text-xs font-bold text-content-muted hover:border-budget-primary/30 transition-colors active:scale-[0.98] px-1"
          >
            <span className="material-symbols-outlined text-base text-budget-primary shrink-0">group_add</span>
            <span className="truncate">{t('trips.joinTrip')}</span>
          </button>
          <button
            type="button"
            onClick={onCreateTrip}
            className="flex-[1.15] min-w-0 flex items-center justify-center gap-1.5 h-11 rounded-xl bg-budget-primary hover:bg-budget-primary-dark text-white text-[10px] sm:text-xs font-bold shadow-md shadow-black/20 active:scale-[0.98] transition-all px-1.5"
          >
            <span className="material-symbols-outlined text-[18px] shrink-0">add</span>
            <span className="truncate">{t('budget.createNewShort')}</span>
          </button>
        </div>

        <PaywallRoiCard activeTrip={activeTrip} />

        {/* Active Trip Section */}
        <section>
          <div className="flex items-center justify-between mb-4 px-1">
            <h3 className="text-content/40 text-[10px] font-bold uppercase tracking-[0.2em]">{t('budget.activeTrip')}</h3>
            {activeTrip && (
              <div className="flex items-center gap-1.5 bg-green-500/10 text-green-400 text-[10px] font-bold px-2 py-1 rounded-full border border-green-500/20">
                <span className="size-1.5 rounded-full bg-green-500 animate-pulse"></span>
                {t('trips.inProgress')}
              </div>
            )}
          </div>

          {activeTrip ? (
            /* Active Trip Card - Modern Redesign */
            <div
              onClick={onOpenTrip}
              className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-surface-dark to-card-dark dark:from-[#121d2b] dark:to-[#0a1525] p-7 shadow-xl border border-overlay/10 dark:border-white/[0.08] group cursor-pointer active:scale-[0.98] transition-all"
            >
              {/* Decorative Glow */}
              <div className="absolute -top-24 -right-24 size-56 bg-budget-primary/10 blur-[60px] rounded-full group-hover:bg-budget-primary/20 transition-all duration-500"></div>

              <div className="relative z-10">
                <div className="flex flex-col gap-1 mb-6">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-budget-primary text-sm">location_on</span>
                    <p className="text-budget-primary/80 text-[10px] font-bold uppercase tracking-[0.1em]">{activeTrip.location}</p>
                  </div>
                  <h2 className="text-2xl font-black text-content leading-tight tracking-tight group-hover:text-budget-primary transition-colors">
                    {activeTrip.name}
                  </h2>
                  {activeTrip.type === 'group' && (
                    <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold text-budget-primary uppercase">
                      <span className="material-symbols-outlined text-xs">groups</span>
                      {t('trips.groupTrip')}
                    </span>
                  )}
                </div>

                <div className="flex items-end justify-between border-t border-overlay/10 dark:border-white/[0.05] pt-5 mt-auto">
                  <div className="flex flex-col">
                    <span className="text-content-muted text-[9px] font-bold uppercase tracking-[0.15em] mb-1.5">{t('budget.totalSpent')}</span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-black text-content tracking-tighter">
                        {calculateTotal(activeTrip)}
                      </span>
                      <span className="text-content-muted text-xs font-bold">COP</span>
                    </div>
                  </div>

                  <button className="flex items-center justify-center size-14 bg-overlay/5 hover:bg-budget-primary text-content hover:text-white rounded-[20px] transition-all border border-overlay/10 group-hover:border-budget-primary/30 group-hover:shadow-[0_0_20px_rgba(255,108,82,0.3)]">
                    <span className="material-symbols-outlined text-[26px]">payments</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Empty State */
            <div
              onClick={onCreateTrip}
              className="rounded-[32px] border-2 border-dashed border-overlay/15 p-10 flex flex-col items-center justify-center text-center gap-4 cursor-pointer hover:bg-overlay/5 hover:border-budget-primary/25 transition-all group"
            >
              <div className="size-14 rounded-[20px] bg-overlay/5 flex items-center justify-center group-hover:bg-budget-primary/20 transition-all">
                <span className="material-symbols-outlined text-2xl text-content-muted group-hover:text-budget-primary">add_location_alt</span>
              </div>
              <div>
                <p className="text-content-muted font-medium text-sm">{t('budget.noActive')}</p>
                <p className="text-content-subtle text-xs mt-1">{t('budget.startOneHint')}</p>
              </div>
            </div>
          )}
        </section>

        {/* History Section */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between mb-1 px-1 gap-2">
            <h3 className="text-content/30 text-[10px] font-bold uppercase tracking-[0.2em]">{t('budget.history')}</h3>
            <div className="flex items-center gap-2 shrink-0">
              {!isOnline && pastTrips.length > 0 && (
                <span className="text-[9px] font-bold text-blue-300/80 uppercase tracking-wide hidden sm:inline">
                  {t('trips.historyOfflineHint')}
                </span>
              )}
              <span className="text-[10px] font-bold text-content/25 tabular-nums">
                {pastTrips.length}/{MAX_PAST_TRIPS}
              </span>
            </div>
          </div>

          {pastTrips.length >= MAX_PAST_TRIPS && (
            <p className="text-[11px] leading-relaxed text-amber-400/90 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2.5">
              {t('budget.historyFullHint')}
            </p>
          )}

          <div className="flex flex-col gap-3">
            {pastTrips.length > 0 ? (
              pastTrips.map((trip) => (
                <div
                  key={trip.id}
                  onClick={() => onOpenHistoryTrip(trip)}
                  className="flex items-center gap-4 p-4 rounded-[22px] bg-surface-dark border border-overlay/10 shadow-sm cursor-pointer hover:bg-overlay/5 hover:border-overlay/15 transition-all group"
                >
                  {/* Icon Representation */}
                  <div className="size-12 rounded-xl bg-surface-dark flex items-center justify-center border border-overlay/5 shrink-0 group-hover:border-budget-primary/20 transition-colors">
                    <span className="material-symbols-outlined text-content/20 group-hover:text-budget-primary transition-colors text-xl">history_toggle_off</span>
                  </div>

                  <div className="flex flex-col flex-1 min-w-0">
                    <div className="flex justify-between items-baseline gap-2">
                      <h4 className="font-bold text-content text-sm truncate group-hover:text-budget-primary transition-colors">{trip.name}</h4>
                      <span className="text-[9px] font-bold text-content/20 uppercase bg-overlay/5 px-2 py-0.5 rounded-md shrink-0">{trip.date}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-[11px] text-content/40 truncate">{trip.location}</p>
                      <div className="flex items-center gap-3">
                        <p className="font-extrabold text-content text-[13px] tracking-tight">
                          {calculateTotal(trip)}
                        </p>
                        <button
                          onClick={(e) => handleDeleteTrip(e, trip.id)}
                          className="flex size-8 items-center justify-center rounded-lg bg-overlay/5 text-content/20 hover:bg-red-500/10 hover:text-red-500 transition-all border border-overlay/5 shrink-0"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-16 flex flex-col items-center justify-center text-center opacity-10">
                <span className="material-symbols-outlined text-5xl mb-3">auto_awesome_motion</span>
                <p className="text-sm font-bold uppercase tracking-widest">{t('trips.noRecords')}</p>
              </div>
            )}
          </div>
          <div className="shrink-0 h-2 w-full" aria-hidden="true" />
        </section>

      </main>
    </div>
  );
};