import React from 'react';
import { Language } from '../types/core';
import { useTranslation } from '../hooks/useTranslation';

interface LanguageSelectorProps {
  onSelectLanguage: (language: Language) => void;
  onPrivacyClick: () => void;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ onSelectLanguage, onPrivacyClick }) => {
  const { t } = useTranslation();

  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden">
      <div className="absolute inset-0 z-0">
        <img
          alt="Background Landscape"
          className="h-full w-full object-cover"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuA_epfSeF13Wt1O_ftLHbvoXKFbpitTJ6pBIwwYEQPPpLIt4LOi-YISxfyAqx8u6y2AqI458c0w8O_6v49KhG5jldvD7GYDxNEhAvVJJklMTk-RofMqSv7oRMEcAaxIRvg8q7ABjiypA_ZA52rp7eNyi0IGQNl87_LF98dPZZ1Yu01itsFFJdTCX7UlEniSwVN0SRYv3U88gzqYirCCKmO0e36GKV2w4IBpKWAq-o_hXvNAubly66J6l_cr96B1vdiJDWw1UFHr7Olj"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-white via-white/80 to-transparent opacity-100"></div>
      </div>
      <div className="relative z-10 flex h-full flex-col justify-end px-6 pb-10 pt-12">
        <div className="absolute top-0 left-0 right-0 bottom-1/3 flex items-center justify-center opacity-90">
          <img
            alt="Hidden Logo"
            className="h-40 w-auto drop-shadow-2xl"
            src="/assets/ui/lang_icon.png"
          />
        </div>
        <div className="mb-8 flex flex-col gap-2 text-center">
          {/* Text Title removed, Subtitle updated to deep blue */}
          <p className="text-secondary text-base font-medium leading-relaxed px-4">
            {t('onboarding.subtitle')}
          </p>
        </div>
        <div className="flex w-full flex-col gap-4 items-center mb-6">
          <button
            onClick={() => onSelectLanguage(Language.Spanish)}
            className="flex w-full max-w-[480px] cursor-pointer items-center justify-center gap-3 overflow-hidden rounded-xl h-14 px-5 bg-sunset-orange hover:bg-sunset-orange/90 transition-colors text-white text-lg font-bold leading-normal tracking-[0.015em] shadow-lg shadow-orange-200"
          >
            <span className="truncate">{t('onboarding.spanish')}</span>
          </button>
          <button
            onClick={() => onSelectLanguage(Language.English)}
            className="flex w-full max-w-[480px] cursor-pointer items-center justify-center gap-3 overflow-hidden rounded-xl h-14 px-5 bg-deep-blue hover:bg-deep-blue/90 transition-colors text-content text-lg font-bold leading-normal tracking-[0.015em] shadow-lg shadow-blue-200"
          >
            <span className="truncate">{t('onboarding.english')}</span>
          </button>
        </div>
        <div className="flex justify-center">
          <button
            onClick={onPrivacyClick}
            className="text-secondary hover:text-primary transition-colors text-xs font-semibold leading-normal underline decoration-1 underline-offset-4 opacity-80"
          >
            {t('onboarding.privacyPolicy')}
          </button>
        </div>
      </div>
    </div>
  );
};