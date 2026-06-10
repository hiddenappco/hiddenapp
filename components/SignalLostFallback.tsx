import React from 'react';
import { Language } from '../types/core';
import { useTranslation } from '../hooks/useTranslation';

interface SignalLostFallbackProps {
  language: Language;
  onGoToVault: () => void;
}

export const SignalLostFallback: React.FC<SignalLostFallbackProps> = ({ language, onGoToVault }) => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen w-full bg-background-dark font-display text-content flex flex-col items-center justify-center p-6 relative overflow-hidden selection:bg-primary selection:text-white">
      {/* Premium glowing grid background pattern */}
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, rgba(16,185,129,0.5) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-red-500/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] h-[250px] bg-emerald-500/[0.03] rounded-full blur-[80px] pointer-events-none" />

      <div className="w-full max-w-[420px] relative z-10 flex flex-col items-center text-center">
        {/* State indicator Badge */}
        <div className="mb-6 flex items-center gap-1.5 border border-red-500/20 rounded-full px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-red-400 bg-red-500/5 shadow-sm shadow-red-950/20">
          <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse shrink-0"></span>
          <span>{t('offline.noSignal')}</span>
        </div>

        {/* Big pulsing Signal Off Icon */}
        <div className="relative size-24 rounded-[32px] bg-gradient-to-b from-red-500/10 to-red-500/5 border border-red-500/20 flex items-center justify-center mb-8 shadow-2xl shadow-red-950/30 group">
          <div className="absolute inset-0 rounded-[32px] bg-red-500/10 blur-[8px] opacity-70 animate-pulse pointer-events-none"></div>
          <span className="material-symbols-outlined text-[42px] text-red-400 drop-shadow-[0_0_12px_rgba(239,68,68,0.4)] transition-transform duration-500 group-hover:scale-105">
            signal_wifi_off
          </span>
        </div>

        {/* Messaging Box */}
        <h1 className="text-xl sm:text-2xl font-black text-content leading-tight tracking-tight mb-3">
          {t('offline.title')}
        </h1>
        
        <p className="text-xs sm:text-sm text-content/60 leading-relaxed max-w-[320px] mb-8 font-medium">
          {t('offline.body')}
        </p>

        {/* Action Escape Card */}
        <div className="w-full p-6 rounded-[28px] bg-surface-dark dark:bg-gradient-to-br dark:from-[#0a1f35]/60 dark:to-[#12385c]/40 border border-overlay/10 backdrop-blur-md shadow-2xl dark:shadow-black/40 relative overflow-hidden group">
          <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, rgba(16,185,129,0.3) 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
          
          <div className="flex flex-col items-center gap-4 relative z-10">
            <div className="size-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-inner">
              <span className="material-symbols-outlined text-emerald-400 text-xl animate-bounce">explore</span>
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
              onClick={onGoToVault}
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 rounded-[18px] shadow-lg shadow-emerald-950/20 border border-emerald-500/30 transition-all duration-300 active:scale-[0.98] mt-1 relative overflow-hidden"
            >
              <span>{t('offline.goToVault')}</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
