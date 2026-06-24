import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../hooks/useTranslation';
import { useAuth } from '../layout/AuthProvider';
import { useUserProfile } from '../../hooks/useFirestore';
import { useSettingsAccess, type SettingsSectionId } from '../../hooks/useSettingsAccess';
import { SettingsScreenShell } from './SettingsScreenShell';
import { PREMIUM_CHECKOUT_ENABLED } from '../../config/constants';

interface SettingsPremiumProps {
    onBack: () => void;
}

export const SettingsPremium: React.FC<SettingsPremiumProps> = ({ onBack }) => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { user } = useAuth();
    const { data: profile } = useUserProfile(user?.uid);
    const { isPremium, canAccess } = useSettingsAccess(user, profile);

    useEffect(() => {
        if (!canAccess('premium')) {
            navigate('/settings', { replace: true });
        }
    }, [canAccess, navigate]);

    if (!canAccess('premium')) {
        return null;
    }

    return (
        <SettingsScreenShell title={t('settings.premium.title')} onBack={onBack}>
            <div className="flex flex-col px-5 pt-6 pb-8 gap-6">
                <div
                    className={`rounded-2xl border p-5 flex flex-col gap-3 ${
                        isPremium
                            ? 'border-amber-500/30 bg-gradient-to-br from-amber-500/15 to-orange-600/5'
                            : 'border-overlay/10 bg-surface-dark'
                    }`}
                >
                    <div className="flex items-center gap-3">
                        <div className="size-12 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400">
                            <span className="material-symbols-outlined text-[28px]">workspace_premium</span>
                        </div>
                        <div>
                            <p className="text-base font-bold text-content">
                                {isPremium ? t('settings.premium.activeTitle') : t('settings.premium.freeTitle')}
                            </p>
                            <p className="text-xs text-content-muted mt-0.5">
                                {isPremium ? t('settings.premium.activeDesc') : t('settings.premium.freeDesc')}
                            </p>
                        </div>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={() => navigate('/premium')}
                    className="w-full bg-primary hover:bg-orange-600 text-white font-bold h-14 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                    <span>{isPremium ? t('settings.premium.manageCta') : t('settings.premium.upgradeCta')}</span>
                    <span className="material-symbols-outlined">arrow_forward</span>
                </button>

                {!PREMIUM_CHECKOUT_ENABLED && (
                    <p className="text-xs text-content-subtle leading-relaxed text-center px-2">
                        {t('settings.premium.checkoutNote')}
                    </p>
                )}
            </div>
        </SettingsScreenShell>
    );
};

type RolePanel = 'guardian' | 'commercial' | 'admin';

const ROLE_SECTION: Record<RolePanel, SettingsSectionId> = {
    guardian: 'guardian',
    commercial: 'commercial',
    admin: 'admin',
};

const ROLE_COPY = {
    guardian: {
        title: 'settings.roles.guardian.title',
        body: 'settings.roles.guardian.body',
        roadmap: 'settings.roles.guardian.roadmap',
    },
    commercial: {
        title: 'settings.roles.commercial.title',
        body: 'settings.roles.commercial.body',
        roadmap: 'settings.roles.commercial.roadmap',
    },
    admin: {
        title: 'settings.roles.admin.title',
        body: 'settings.roles.admin.body',
        roadmap: 'settings.roles.admin.roadmap',
    },
} as const;

interface RoleSettingsPanelProps {
    role: RolePanel;
    onBack: () => void;
}

export const RoleSettingsPanel: React.FC<RoleSettingsPanelProps> = ({ role, onBack }) => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { user } = useAuth();
    const { data: profile } = useUserProfile(user?.uid);
    const { canAccess } = useSettingsAccess(user, profile);

    const sectionId = ROLE_SECTION[role];
    const copy = ROLE_COPY[role];

    useEffect(() => {
        if (!canAccess(sectionId)) {
            navigate('/settings', { replace: true });
        }
    }, [canAccess, navigate, sectionId]);

    if (!canAccess(sectionId)) {
        return null;
    }

    const icons: Record<RolePanel, string> = {
        guardian: 'shield_person',
        commercial: 'storefront',
        admin: 'admin_panel_settings',
    };

    return (
        <SettingsScreenShell title={t(copy.title)} onBack={onBack}>
            <div className="flex flex-col px-5 pt-8 pb-8 gap-6 items-center text-center">
                <div className="size-20 rounded-3xl bg-surface-dark border border-overlay/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[40px] text-primary">{icons[role]}</span>
                </div>
                <div className="max-w-sm">
                    <p className="text-sm text-content leading-relaxed">{t(copy.body)}</p>
                    <p className="text-xs text-content-subtle mt-4 leading-relaxed border-t border-overlay/5 pt-4">
                        {t(copy.roadmap)}
                    </p>
                </div>
            </div>
        </SettingsScreenShell>
    );
};
