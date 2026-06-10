import React from 'react';
import { Language } from '../types/core';
import { Trip } from '../types/trips';
import { useTranslation } from '../hooks/useTranslation';

interface BudgetProps {
  language: Language;
  activeTrip: Trip | null;
  pastTrips: Trip[];
  onBack: () => void;
  onMenuClick: () => void;
  onCreateTrip: () => void;
  onOpenTrip: () => void;
  onOpenHistoryTrip: (trip: Trip) => void;
  onDeleteTrip: (tripId: string) => void;
}

export const Budget: React.FC<BudgetProps> = ({
  language,
  activeTrip,
  pastTrips,
  onBack,
  onMenuClick,
  onCreateTrip,
  onOpenTrip,
  onOpenHistoryTrip,
  onDeleteTrip
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
    <div className="bg-background-dark font-display antialiased text-content h-screen w-full overflow-hidden flex flex-col dark">
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

      <main className="flex-1 overflow-y-auto no-scrollbar p-4 flex flex-col gap-6 pb-[calc(6rem+env(safe-area-inset-bottom,1.5rem))]">

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
              className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#121d2b] to-[#0a1525] p-7 shadow-2xl border border-white/[0.08] group cursor-pointer active:scale-[0.98] transition-all"
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
                </div>

                <div className="flex items-end justify-between border-t border-white/[0.05] pt-5 mt-auto">
                  <div className="flex flex-col">
                    <span className="text-content/30 text-[9px] font-bold uppercase tracking-[0.15em] mb-1.5">{t('budget.totalSpent')}</span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-black text-content tracking-tighter">
                        {calculateTotal(activeTrip)}
                      </span>
                      <span className="text-content/20 text-xs font-bold">COP</span>
                    </div>
                  </div>

                  <button className="flex items-center justify-center size-14 bg-white/[0.03] hover:bg-budget-primary text-white rounded-[20px] transition-all border border-overlay/10 group-hover:border-budget-primary/30 group-hover:shadow-[0_0_20px_rgba(255,108,82,0.3)]">
                    <span className="material-symbols-outlined text-[26px]">payments</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Empty State */
            <div
              onClick={onCreateTrip}
              className="rounded-[32px] border-2 border-dashed border-overlay/10 p-12 flex flex-col items-center justify-center text-center gap-5 cursor-pointer hover:bg-white/[0.02] hover:border-budget-primary/30 transition-all group"
            >
              <div className="size-16 rounded-[22px] bg-overlay/5 flex items-center justify-center group-hover:bg-budget-primary group-hover:scale-110 transition-all shadow-lg">
                <span className="material-symbols-outlined text-3xl text-content/20 group-hover:text-content">add_location_alt</span>
              </div>
              <div>
                <p className="text-content/40 font-medium text-sm mb-1">{t('budget.noActive')}</p>
                <p className="text-budget-primary font-bold text-base tracking-wide">{t('budget.startOne')}</p>
              </div>
            </div>
          )}
        </section>

        {/* History Section */}
        <section>
          <div className="flex items-center justify-between mb-4 px-1">
            <h3 className="text-content/30 text-[10px] font-bold uppercase tracking-[0.2em]">{t('budget.history')}</h3>
          </div>

          <div className="flex flex-col gap-3">
            {pastTrips.length > 0 ? (
              pastTrips.map((trip) => (
                <div
                  key={trip.id}
                  onClick={() => onOpenHistoryTrip(trip)}
                  className="flex items-center gap-4 p-4 rounded-[22px] bg-white/[0.02] border border-white/[0.05] shadow-sm cursor-pointer hover:bg-white/[0.04] hover:border-overlay/10 transition-all group"
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
        </section>

      </main>

      {/* FAB: Create Trip */}
      <div className="absolute bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))] right-6 z-50">
        <button
          onClick={onCreateTrip}
          className="flex items-center gap-2 bg-budget-primary hover:bg-budget-primary-dark text-white h-14 px-6 rounded-full shadow-lg shadow-budget-primary/30 active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-[24px]">add</span>
          <span className="font-bold text-sm tracking-wide">{t('budget.createNew')}</span>
        </button>
      </div>
    </div>
  );
};