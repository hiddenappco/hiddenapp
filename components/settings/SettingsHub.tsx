import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../hooks/useTranslation';
import { useAuth } from '../layout/AuthProvider';
import { useUserProfile } from '../../hooks/useFirestore';
import { useSettingsAccess, type SettingsSection } from '../../hooks/useSettingsAccess';
import { SettingsScreenShell } from './SettingsScreenShell';
import { GuestAccountUpgrade } from '../profile/GuestAccountUpgrade';
import { isGuestProfile } from '../../utils/userIdentity';

interface SettingsHubProps {
    onBack: () => void;
}

const SettingsHubRow: React.FC<{
    section: SettingsSection;
    onClick: () => void;
}> = ({ section, onClick }) => {
    const { t } = useTranslation();

    return (
        <button
            type="button"
            onClick={onClick}
            className="group flex items-center gap-4 bg-overlay/5 hover:bg-overlay/10 p-4 rounded-2xl border border-overlay/5 transition-all active:scale-[0.98] w-full text-left"
        >
            <div
                className={`size-11 rounded-full flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform ${section.accentClass}`}
            >
                <span className="material-symbols-outlined text-[22px]">{section.icon}</span>
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <p className="font-bold text-content text-sm leading-none">{t(section.titleKey)}</p>
                    {section.showPremiumBadge && (
                        <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            {t('settings.hub.premiumActive')}
                        </span>
                    )}
                </div>
                <p className="text-xs text-content-subtle mt-1 leading-snug">{t(section.descriptionKey)}</p>
            </div>
            <span className="material-symbols-outlined text-content/20 text-xl group-hover:translate-x-1 group-hover:text-primary transition-all shrink-0">
                chevron_right
            </span>
        </button>
    );
};

export const SettingsHub: React.FC<SettingsHubProps> = ({ onBack }) => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { user } = useAuth();
    const { data: profile, loading } = useUserProfile(user?.uid);
    const { sections, isGuest } = useSettingsAccess(user, profile);

    const showGuestBanner =
        user?.isAnonymous === true || isGuestProfile(profile);

    if (loading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-background-dark text-content-subtle">
                {t('common.loading')}
            </div>
        );
    }

    return (
        <SettingsScreenShell title={t('settings.hub.title')} onBack={onBack}>
            <div className="flex flex-col px-5 pt-6 pb-8 gap-6">
                <p className="text-sm text-content-muted leading-relaxed px-0.5">{t('settings.hub.subtitle')}</p>

                {showGuestBanner ? (
                    <GuestAccountUpgrade />
                ) : null}

                <div className="flex flex-col gap-3">
                    {sections.map((section) => (
                        <SettingsHubRow
                            key={section.id}
                            section={section}
                            onClick={() => navigate(section.path)}
                        />
                    ))}
                </div>

                {isGuest && (
                    <p className="text-[11px] text-content-subtle leading-relaxed px-1 border-t border-overlay/5 pt-4">
                        {t('settings.hub.guestFootnote')}
                    </p>
                )}
            </div>
        </SettingsScreenShell>
    );
};
