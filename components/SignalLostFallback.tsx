import React from 'react';
import { Language } from '../types/core';
import { useTranslation } from '../hooks/useTranslation';

export type ConnectivityFallbackVariant = 'offline' | 'server';

interface SignalLostFallbackProps {
  language: Language;
  variant?: ConnectivityFallbackVariant;
  onGoToVault: () => void;
  onGoToLedger: () => void;
}

export const SignalLostFallback: React.FC<SignalLostFallbackProps> = ({
  variant = 'offline',
  onGoToVault,
  onGoToLedger,
}) => {
  const { t } = useTranslation();
  const isServer = variant === 'server';

  return (
    <div className="min-h-screen w-full bg-background-dark font-display text-content flex flex-col items-center justify-center p-6 relative overflow-hidden selection:bg-primary selection:text-white">
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, rgba(16,185,129,0.5) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full blur-[100px] pointer-events-none ${
        isServer ? 'bg-amber-500/5' : 'bg-red-500/5'
      }`} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] h-[250px] bg-emerald-500/[0.03] rounded-full blur-[80px] pointer-events-none" />

      <div className="w-full max-w-[420px] relative z-10 flex flex-col items-center text-center">
        <div className={`mb-6 flex items-center gap-1.5 border rounded-full px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] glass-pill ${
          isServer
            ? 'border-amber-500/25 text-amber-300'
            : 'border-red-500/25 text-red-400'
        }`}>
          {!isServer && <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />}
          <span>{isServer ? t('connectivity.server.badge') : t('connectivity.offline.badge')}</span>
        </div>

        <div className={`relative size-24 rounded-[32px] flex items-center justify-center mb-8 shadow-2xl glass-surface ${
          isServer ? 'border-amber-500/20' : 'border-red-500/20'
        }`}>
          <span className={`material-symbols-outlined text-[42px] ${isServer ? 'text-amber-400' : 'text-red-400'}`}>
            {isServer ? 'cloud_off' : 'signal_wifi_off'}
          </span>
        </div>

        <h1 className="text-xl sm:text-2xl font-black text-content leading-tight tracking-tight mb-3">
          {isServer ? t('connectivity.server.title') : t('connectivity.offline.title')}
        </h1>

        <p className="text-xs sm:text-sm text-content/60 leading-relaxed max-w-[320px] mb-8 font-medium">
          {isServer ? t('connectivity.server.body') : t('connectivity.offline.body')}
        </p>

        <div className="w-full flex flex-col gap-4">
          <div className="w-full p-5 rounded-[28px] glass-surface border-budget-primary/20 relative overflow-hidden">
            <div className="flex flex-col items-center gap-3 relative z-10">
              <div className="size-10 rounded-xl bg-budget-primary/10 border border-budget-primary/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-budget-primary text-xl">payments</span>
              </div>
              <div className="text-center">
                <h3 className="text-xs font-black text-budget-primary uppercase tracking-widest mb-1.5">
                  {t('offline.ledgerMode')}
                </h3>
                <p className="text-[11px] text-content/50 leading-normal max-w-[280px]">
                  {t('offline.ledgerDesc')}
                </p>
              </div>
              <button
                type="button"
                onClick={onGoToLedger}
                className="touch-target w-full bg-budget-primary hover:bg-budget-primary-dark text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 rounded-[18px] shadow-lg shadow-budget-primary/20 border border-budget-primary/30 transition-all active:scale-[0.98]"
              >
                <span>{t('offline.goToLedger')}</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>
          </div>

          <div className="w-full p-5 rounded-[28px] glass-surface relative overflow-hidden">
            <div className="flex flex-col items-center gap-3 relative z-10">
              <div className="size-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-emerald-400 text-xl">explore</span>
              </div>
              <div className="text-center">
                <h3 className="text-xs font-black text-emerald-400 uppercase tracking-widest mb-1.5">
                  {t('offline.explorerMode')}
                </h3>
                <p className="text-[11px] text-content/50 leading-normal max-w-[280px]">
                  {t('offline.explorerDesc')}
                </p>
              </div>
              <button
                type="button"
                onClick={onGoToVault}
                className="touch-target w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 rounded-[18px] shadow-lg shadow-emerald-950/20 border border-emerald-500/30 transition-all active:scale-[0.98]"
              >
                <span>{t('offline.goToVault')}</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
