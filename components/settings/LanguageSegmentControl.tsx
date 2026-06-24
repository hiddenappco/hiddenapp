import React from 'react';
import { Language } from '../../types/core';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTranslation } from '../../hooks/useTranslation';

interface LanguageSegmentControlProps {
    onLanguageChange?: (language: Language) => void;
}

export const LanguageSegmentControl: React.FC<LanguageSegmentControlProps> = ({ onLanguageChange }) => {
    const { currentLanguage, setLanguage } = useLanguage();
    const { t } = useTranslation();

    const select = (lang: Language) => {
        setLanguage(lang);
        onLanguageChange?.(lang);
    };

    return (
        <div className="flex bg-surface-dark border border-overlay/10 rounded-2xl p-1.5 w-full relative">
            <div
                className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-primary rounded-xl transition-all duration-300 ease-out transform ${
                    currentLanguage === Language.Spanish ? 'translate-x-0' : 'translate-x-full'
                }`}
            />
            <button
                type="button"
                onClick={() => select(Language.Spanish)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm z-10 transition-colors duration-300 ${
                    currentLanguage === Language.Spanish ? 'text-content' : 'text-content-secondary hover:text-content'
                }`}
            >
                <span className="material-symbols-outlined text-[20px]">language</span>
                <span>{t('settings.languageEs')}</span>
            </button>
            <button
                type="button"
                onClick={() => select(Language.English)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm z-10 transition-colors duration-300 ${
                    currentLanguage === Language.English ? 'text-content' : 'text-content-secondary hover:text-content'
                }`}
            >
                <span className="material-symbols-outlined text-[20px]">language</span>
                <span>{t('settings.languageEn')}</span>
            </button>
        </div>
    );
};
