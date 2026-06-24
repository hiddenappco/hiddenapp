import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Language, Theme } from '../../types/core';
import { useTranslation } from '../../hooks/useTranslation';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../layout/AuthProvider';
import { useUserProfile } from '../../hooks/useFirestore';
import { SettingsScreenShell } from './SettingsScreenShell';
import { ThemeSegmentControl } from './ThemeSegmentControl';
import { LanguageSegmentControl } from './LanguageSegmentControl';
import {
    dismissPackLanguageAlert,
    shouldShowPackLanguageAlert,
} from '../../utils/offgridPackLanguageAlert';
import { resetAllFeatureTooltips } from '../../hooks/useFeatureTooltip';
import { updateAppPrefs } from '../../services/appPrefsService';

interface AppSettingsProps {
    onBack: () => void;
}

export const AppSettings: React.FC<AppSettingsProps> = ({ onBack }) => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { user } = useAuth();
    const { data: profile } = useUserProfile(user?.uid);
    const { currentLanguage } = useLanguage();
    const [packAlertTick, setPackAlertTick] = useState(0);
    const [coachmarksReset, setCoachmarksReset] = useState(false);

    useEffect(() => {
        setPackAlertTick((n) => n + 1);
    }, [currentLanguage]);

    const downloadedPacks = useMemo(() => {
        try {
            return JSON.parse(localStorage.getItem('offgrid_downloaded_packs') || '{}') as Record<
                string,
                { downloadedAt: string }
            >;
        } catch {
            return {};
        }
    }, [packAlertTick]);

    const packLanguageAlert = shouldShowPackLanguageAlert(downloadedPacks);

    const syncPrefs = useCallback(
        (partial: { theme?: 'light' | 'dark'; language?: 'es' | 'en' }) => {
            if (!user?.uid) return;
            void updateAppPrefs(user.uid, partial, profile?.appPrefs).catch((err) => {
                console.warn('[AppSettings] appPrefs sync failed', err);
            });
        },
        [user?.uid, profile?.appPrefs]
    );

    const handleThemeChange = (theme: Theme) => {
        syncPrefs({ theme: theme === Theme.Light ? 'light' : 'dark' });
    };

    const handleLanguageChange = (lang: Language) => {
        setPackAlertTick((n) => n + 1);
        syncPrefs({ language: lang === Language.Spanish ? 'es' : 'en' });
    };

    return (
        <SettingsScreenShell title={t('settings.app.title')} onBack={onBack}>
            <div className="flex flex-col w-full px-5 pt-6 pb-8 gap-8">
                <div>
                    <h3 className="text-xl font-bold mb-4 text-content">{t('settings.appearance')}</h3>
                    <ThemeSegmentControl onThemeChange={handleThemeChange} />
                </div>

                <div>
                    <h3 className="text-xl font-bold mb-4 text-content">{t('settings.language')}</h3>
                    <LanguageSegmentControl onLanguageChange={handleLanguageChange} />

                    {packLanguageAlert && (
                        <div className="mt-3 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 flex flex-col gap-2">
                            <p className="text-xs text-amber-100/90 leading-relaxed">
                                {t('vault.languagePackAlertSettings')}
                            </p>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={() => navigate('/offgrid-vault')}
                                    className="min-h-[44px] px-3 py-2 rounded-lg bg-amber-500 text-amber-950 text-[11px] font-bold uppercase tracking-wide"
                                >
                                    {t('vault.languagePackAlertAction')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        dismissPackLanguageAlert();
                                        setPackAlertTick((n) => n + 1);
                                    }}
                                    className="min-h-[44px] px-3 py-2 rounded-lg border border-amber-500/30 text-amber-200 text-[11px] font-semibold"
                                >
                                    {t('vault.languagePackAlertDismiss')}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div>
                    <h3 className="text-xl font-bold mb-2 text-content">{t('settings.appTips')}</h3>
                    <p className="text-xs text-content-muted mb-3 leading-relaxed">{t('settings.resetCoachmarksHint')}</p>
                    <button
                        type="button"
                        onClick={() => {
                            resetAllFeatureTooltips();
                            setCoachmarksReset(true);
                            window.setTimeout(() => setCoachmarksReset(false), 4000);
                        }}
                        className="w-full min-h-[44px] rounded-xl border border-overlay/10 bg-surface-dark text-content font-semibold text-sm flex items-center justify-center gap-2 hover:border-primary/30 hover:bg-overlay/5 transition-colors active:scale-[0.98]"
                    >
                        <span className="material-symbols-outlined text-[20px] text-primary">tips_and_updates</span>
                        {t('settings.resetCoachmarks')}
                    </button>
                    {coachmarksReset && (
                        <p className="mt-2 text-xs text-emerald-400 font-medium">{t('settings.resetCoachmarksDone')}</p>
                    )}
                </div>

                <div>
                    <h3 className="text-xl font-bold mb-4 text-content">{t('settings.hub.legal')}</h3>
                    <div className="flex flex-col gap-2">
                        <button
                            type="button"
                            onClick={() => navigate('/terms')}
                            className="w-full flex items-center justify-between gap-3 rounded-xl border border-overlay/10 bg-surface-dark px-4 py-3.5 text-left hover:border-primary/20 transition-colors active:scale-[0.99]"
                        >
                            <span className="text-sm font-semibold text-content">{t('settings.hub.terms')}</span>
                            <span className="material-symbols-outlined text-content-subtle text-xl">chevron_right</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate('/privacy')}
                            className="w-full flex items-center justify-between gap-3 rounded-xl border border-overlay/10 bg-surface-dark px-4 py-3.5 text-left hover:border-primary/20 transition-colors active:scale-[0.99]"
                        >
                            <span className="text-sm font-semibold text-content">{t('settings.hub.privacy')}</span>
                            <span className="material-symbols-outlined text-content-subtle text-xl">chevron_right</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate('/faq')}
                            className="w-full flex items-center justify-between gap-3 rounded-xl border border-overlay/10 bg-surface-dark px-4 py-3.5 text-left hover:border-primary/20 transition-colors active:scale-[0.99]"
                        >
                            <span className="text-sm font-semibold text-content">{t('settings.hub.faq')}</span>
                            <span className="material-symbols-outlined text-content-subtle text-xl">chevron_right</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate('/pact')}
                            className="w-full flex items-center justify-between gap-3 rounded-xl border border-overlay/10 bg-surface-dark px-4 py-3.5 text-left hover:border-primary/20 transition-colors active:scale-[0.99]"
                        >
                            <span className="text-sm font-semibold text-content">{t('settings.hub.pact')}</span>
                            <span className="material-symbols-outlined text-content-subtle text-xl">chevron_right</span>
                        </button>
                    </div>
                </div>
            </div>
        </SettingsScreenShell>
    );
};
