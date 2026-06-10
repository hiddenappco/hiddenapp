import React from 'react';
import { useTranslation } from '../hooks/useTranslation';

interface PasswordRecoveryProps {
  onBack: () => void;
  onSubmit: () => void;
}

export const PasswordRecovery: React.FC<PasswordRecoveryProps> = ({ onBack, onSubmit }) => {
  const { t } = useTranslation();

  return (
    <div className="bg-[#f8f7f6] dark:bg-[#221910] text-[#181411] min-h-screen w-full flex flex-col font-display overflow-y-auto no-scrollbar pb-24">
      {/* Header */}
      <div className="sticky top-0 z-50 flex items-center bg-overlay/95 dark:bg-[#221910]/95 backdrop-blur-sm px-4 pb-2 pt-safe justify-between border-b border-gray-100 dark:border-gray-800 transition-colors">
        <button 
          onClick={onBack}
          className="text-[#0f2537] dark:text-content flex size-12 shrink-0 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined">arrow_back_ios_new</span>
        </button>
        <h2 className="text-[#0f2537] dark:text-content text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center pr-12">{t('auth.recovery.header')}</h2>
      </div>

      {/* Title Section */}
      <div className="px-4 pt-6 pb-2">
        <h1 className="text-[#0f2537] dark:text-content text-[28px] font-bold leading-tight tracking-[-0.015em] mb-2">{t('auth.recovery.title')}</h1>
        <p className="text-[#637588] dark:text-content-muted text-base font-normal leading-normal">
          {t('auth.recovery.subtitle')}
        </p>
      </div>

      {/* Form Section */}
      <form className="flex flex-col gap-4 px-4 py-4" onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
        
        {/* Email */}
        <div className="flex flex-col gap-2 mt-4">
          <label className="text-[#0f2537] dark:text-gray-200 text-base font-medium leading-normal">{t('auth.recovery.emailLabel')}</label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-content-muted">mail</span>
            <input 
              className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl text-[#181411] dark:text-content focus:outline-0 focus:ring-2 focus:ring-[#ee8c2b]/50 border border-[#e6e0db] dark:border-gray-700 bg-white dark:bg-gray-800 focus:border-[#ee8c2b] h-14 placeholder:text-[#897561] dark:placeholder:text-content-subtle pl-12 pr-4 text-base font-normal leading-normal transition-all" 
              placeholder={t('auth.recovery.emailPlaceholder')} 
              required 
              type="email"
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="mt-8">
          <button className="w-full bg-[#ee8c2b] hover:bg-[#d97b1e] text-content font-bold text-lg h-14 rounded-full shadow-lg shadow-[#ee8c2b]/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
            <span>{t('auth.recovery.submit')}</span>
            <span className="material-symbols-outlined">send</span>
          </button>
        </div>

        {/* Login Link */}
        <div className="text-center mt-6">
          <button 
            type="button"
            onClick={onBack}
            className="text-[#637588] dark:text-content-muted text-sm font-medium hover:text-[#ee8c2b] transition-colors flex items-center justify-center gap-2 w-full"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            {t('auth.recovery.backToLogin')}
          </button>
        </div>
      </form>
    </div>
  );
};
