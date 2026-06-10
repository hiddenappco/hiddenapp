import React, { useState } from 'react';
import { Language } from '../types/core';
import { useTranslation } from '../hooks/useTranslation';

interface CreateTripProps {
  language: Language;
  onBack: () => void;
  onStart: (name: string, destination: string) => void;
}

export const CreateTrip: React.FC<CreateTripProps> = ({ onBack, onStart }) => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [dest, setDest] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && dest) {
      onStart(name, dest);
    }
  };

  return (
    <div className="bg-background-dark font-display antialiased text-content h-screen w-full flex flex-col overflow-hidden">
      <div className="relative flex h-full w-full flex-col max-w-md mx-auto bg-background-dark">

        {/* Header */}
        <header className="flex items-center px-4 pb-2 pt-safe justify-between sticky top-0 z-50 shrink-0 bg-background-dark/90 backdrop-blur-md border-b border-overlay/5">
          <button
            onClick={onBack}
            className="text-content flex size-12 shrink-0 items-center justify-start hover:opacity-70 transition-opacity"
          >
            <span className="material-symbols-outlined text-[24px]">close</span>
          </button>
          <img src="/assets/ui/logo.png" alt="Hidden Logo" className="h-8 object-contain" />
        </header>

        <main className="flex-1 px-6 pt-8 flex flex-col">
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold text-content leading-tight mb-2">{t('trips.startTracking')}</h1>
            <p className="text-content/40 text-sm">{t('trips.configureSubtitle')}</p>
          </div>

          <form className="flex flex-col gap-6" onSubmit={handleSubmit}>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-content/60 ml-1">{t('trips.tripName')}</label>
              <input
                className="w-full h-14 rounded-xl bg-overlay/5 border-2 border-overlay/5 focus:border-budget-primary/50 focus:bg-overlay/10 focus:outline-none px-4 text-lg font-medium text-content placeholder:text-content/20 transition-all"
                placeholder={t('trips.tripNamePlaceholder')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-content/60 ml-1">{t('trips.mainDestination')}</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-content/20">location_on</span>
                <input
                  className="w-full h-14 rounded-xl bg-overlay/5 border-2 border-overlay/5 focus:border-budget-primary/50 focus:bg-overlay/10 focus:outline-none pl-11 pr-4 text-base font-medium text-content placeholder:text-content/20 transition-all"
                  placeholder={t('trips.destPlaceholder')}
                  value={dest}
                  onChange={(e) => setDest(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-content/60 ml-1">{t('trips.currency')}</label>
              <div className="flex gap-3">
                <button type="button" className="flex-1 h-12 rounded-xl border-2 border-budget-primary bg-budget-primary/10 text-budget-primary font-bold shadow-sm">COP ($)</button>
                <button type="button" className="flex-1 h-12 rounded-xl border border-overlay/10 bg-overlay/5 text-content/40 font-medium hover:bg-overlay/10">USD ($)</button>
                <button type="button" className="flex-1 h-12 rounded-xl border border-overlay/10 bg-overlay/5 text-content/40 font-medium hover:bg-overlay/10">EUR (€)</button>
              </div>
            </div>

            <div className="mt-auto pb-safe">
              <button
                type="submit"
                disabled={!name || !dest}
                className="w-full h-14 bg-budget-primary hover:bg-budget-primary-dark text-white rounded-xl shadow-xl shadow-budget-primary/30 flex items-center justify-center gap-2 font-bold text-lg active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none"
              >
                {t('trips.createTracker')}
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            </div>

          </form>
        </main>
      </div>
    </div>
  );
};