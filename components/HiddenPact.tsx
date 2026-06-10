import React from 'react';
import { Language } from '../types/core';
import { useTranslation } from '../hooks/useTranslation';

interface HiddenPactProps {
  onMenuClick: () => void;
  language: Language;
  onAccept?: () => void;
  isAccepted?: boolean;
}

const POINT_ICONS = ['footprint', 'diversity_3', 'volume_off', 'cruelty_free', 'savings', 'warning', 'visibility', 'groups'];

export const HiddenPact: React.FC<HiddenPactProps> = ({ onMenuClick, onAccept, isAccepted }) => {
  const { t } = useTranslation();

  const points = POINT_ICONS.map((icon, index) => {
    const n = index + 1;
    return {
      icon,
      title: t(`pact.point${n}Title`),
      quote: t(`pact.point${n}Quote`),
      rule: t(`pact.point${n}Rule`),
      commitment: t(`pact.point${n}Commitment`),
    };
  });

  return (
    <div className="relative bg-[#0c1f17] font-display text-content h-screen w-full flex flex-col overflow-hidden">

      {/* Background Ambience */}
      <div className="absolute inset-0 z-0">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuB_BLkRLoFz7cA_FlGQWKNGCUj8A2s1zzgmjEcPlDdkHqdZEbvsXw1_Jky6G7VTAxvAeo6eanDJb0P8SZ0kts1LW9SjTSe4u8graghYj8Af0PvPjQrvfjW8BvjY-NqNe8UYMiV0xzPscLHtqRZncV_oHj9kwaPa_upnZbKg_PmoIQAyFdwdKuGLjfzTaHNiJ18wGmY2yJiaOoTNml4WW2CZTK95rezD-5RQTqmBzDtPc83Vrj_Fde0FBmh0weQpm2Z1tU_QvS7Z9nyL")' }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-b from-[#0c1f17]/90 via-[#0c1f17]/95 to-[#0c1f17]"></div>
      </div>

      {/* Header */}
      <header className="relative z-20 flex items-center justify-between p-6 pt-safe shrink-0">
        <button
          onClick={onMenuClick}
          className="flex items-center justify-center size-10 rounded-full bg-overlay/10 backdrop-blur-md border border-overlay/10 hover:bg-overlay/20 transition-colors text-content"
        >
          <span className="material-symbols-outlined text-[24px]">menu</span>
        </button>
        <div className="w-10"></div> {/* Spacer */}
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 overflow-y-auto no-scrollbar px-6 pb-24">

        {/* Title Section */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-3 rounded-full bg-emerald-900/30 border border-emerald-500/30 mb-4 shadow-lg shadow-emerald-900/20">
            <span className="material-symbols-outlined text-orange-400 text-3xl">fingerprint</span>
          </div>
          <h1 className="text-3xl font-extrabold leading-tight tracking-tight mb-4 text-transparent bg-clip-text bg-gradient-to-r from-emerald-100 via-white to-emerald-100 whitespace-pre-line">
            {t('pact.title')}
          </h1>
          <p className="text-emerald-100/90 text-sm font-medium mx-auto leading-relaxed border-l-2 border-orange-400 pl-4 text-left italic">
            {t('pact.intro')}
          </p>
        </div>

        {/* Pact Points */}
        <div className="flex flex-col gap-8">

          {points.map((point, index) => (
            <div key={index} className="group relative">
              <div className="absolute left-[19px] top-10 bottom-0 w-0.5 bg-emerald-800/50 group-last:hidden"></div>
              <div className="flex gap-4">
                <div className="flex flex-col items-center shrink-0">
                  <span className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-900 text-orange-400 font-bold text-lg border border-emerald-700 shadow-md z-10">
                    <span className="material-symbols-outlined text-[20px]">{point.icon}</span>
                  </span>
                </div>
                <div className="pb-2">
                  <h3 className="text-lg font-bold text-content mb-1 uppercase tracking-wide">{point.title}</h3>
                  <p className="text-orange-300/90 text-sm font-medium italic mb-3">{point.quote}</p>

                  <div className="bg-overlay/5 rounded-xl p-4 border border-overlay/5 hover:bg-overlay/10 transition-colors">
                    <p className="text-content-secondary text-sm leading-relaxed mb-3">
                      <span className="text-emerald-400 font-bold">{t('pact.ruleLabel')}</span> {point.rule}
                    </p>
                    <p className="text-content-secondary text-sm leading-relaxed">
                      <span className="text-orange-400 font-bold">{t('pact.commitmentLabel')}</span> {point.commitment}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}

        </div>

        {/* Footer Signature */}
        <div className="mt-12 text-center pb-8">
          <div className="h-px w-24 bg-gradient-to-r from-transparent via-orange-400/50 to-transparent mx-auto mb-4"></div>
          <p className="text-emerald-200/60 text-xs italic font-medium">
            {t('pact.footer')}
          </p>
          <div className="mt-4 opacity-50 flex justify-center">
            <img src="/assets/ui/logo.png" alt="Hidden Logo" className="h-6 w-auto grayscale opacity-70" />
          </div>
        </div>

        {/* Action Button for Onboarding */}
        {onAccept && (
          <div className="fixed bottom-0 left-0 right-0 px-6 pb-safe z-50 flex justify-center bg-gradient-to-t from-[#0c1f17] to-transparent pt-8">
            <button
              onClick={onAccept}
              disabled={isAccepted}
              className={`w-full max-w-sm font-bold py-4 rounded-xl shadow-lg transform transition-all flex items-center justify-center gap-3 border ${isAccepted
                  ? "bg-emerald-600/20 text-emerald-400 border-emerald-500/30 cursor-default"
                  : "bg-gradient-to-r from-orange-500 to-orange-600 text-content border-orange-400/20 shadow-[0_10px_20px_rgba(249,115,22,0.3)] hover:shadow-orange-500/40 hover:scale-[1.02] active:scale-[0.98]"
                }`}
            >
              <span className="material-symbols-outlined">
                {isAccepted ? 'check_circle' : 'handshake'}
              </span>
              {isAccepted ? t('pact.accepted') : t('pact.accept')}
            </button>
          </div>
        )}

      </main>
    </div>
  );
};
