import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { Language } from '../../types/core';
import { useTranslation } from '../../hooks/useTranslation';

export const LanguagePackChangeBanner: React.FC = () => {
    const { packLanguageNotice, dismissPackLanguageNotice, currentLanguage } = useLanguage();
    const navigate = useNavigate();
    const { t } = useTranslation();

    if (!packLanguageNotice) return null;

    const langLabel =
        currentLanguage === Language.English
            ? t('settings.languageEn')
            : t('settings.languageEs');

    const body =
        packLanguageNotice === 'offline'
            ? t('vault.languagePackBannerOffline', { lang: langLabel })
            : t('vault.languagePackBannerOnline');

    return (
        <div
            className="fixed top-0 left-0 right-0 z-[55] px-4 pt-safe pb-3 pointer-events-none"
            role="status"
            aria-live="polite"
        >
            <div className="pointer-events-auto mx-auto max-w-lg glass-surface rounded-2xl border border-primary/25 shadow-lg p-4 flex flex-col gap-3">
                <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-primary text-[22px] shrink-0 mt-0.5">
                        translate
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-content leading-snug">
                            {t('vault.languagePackAlertTitle')}
                        </p>
                        <p className="text-xs text-content-muted mt-1 leading-relaxed">{body}</p>
                    </div>
                    <button
                        type="button"
                        onClick={dismissPackLanguageNotice}
                        className="shrink-0 size-8 rounded-full flex items-center justify-center text-content-muted hover:bg-overlay/10 transition-colors"
                        aria-label={t('vault.languagePackAlertDismiss')}
                    >
                        <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                </div>
                {packLanguageNotice === 'online' && (
                    <button
                        type="button"
                        onClick={() => {
                            dismissPackLanguageNotice();
                            navigate('/offgrid-vault');
                        }}
                        className="w-full rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-bold py-2.5 transition-colors"
                    >
                        {t('vault.languagePackAlertAction')}
                    </button>
                )}
            </div>
        </div>
    );
};
