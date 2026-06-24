import { useMemo } from 'react';
import type { User } from 'firebase/auth';
import type { UserProfile } from '../types/social';
import {
    getIdentityFromProfile,
    isGuestProfile,
    type UserType,
} from '../utils/userIdentity';

export type SettingsSectionId =
    | 'app'
    | 'profile'
    | 'notifications'
    | 'premium'
    | 'guardian'
    | 'commercial'
    | 'admin';

export interface SettingsSection {
    id: SettingsSectionId;
    path: string;
    icon: string;
    titleKey: string;
    descriptionKey: string;
    accentClass: string;
    /** Premium row shows active badge when user has membership */
    showPremiumBadge?: boolean;
}

function isGuestUser(user: User | null | undefined, profile: Partial<UserProfile> | null | undefined): boolean {
    if (!user) return true;
    if (user.isAnonymous) return true;
    return isGuestProfile(profile);
}

function canAccessSection(
    sectionId: SettingsSectionId,
    guest: boolean,
    userType: UserType,
    _isPremium: boolean
): boolean {
    switch (sectionId) {
        case 'app':
        case 'profile':
        case 'notifications':
            return true;
        case 'premium':
            return !guest;
        case 'guardian':
            return !guest && userType === 'Guardián Local';
        case 'commercial':
            return !guest && userType === 'Aliado Comercial';
        case 'admin':
            return !guest && (userType === 'CEO' || userType === 'Team');
        default:
            return false;
    }
}

const ALL_SECTIONS: Omit<SettingsSection, 'showPremiumBadge'>[] = [
    {
        id: 'app',
        path: '/settings/app',
        icon: 'tune',
        titleKey: 'settings.hub.general',
        descriptionKey: 'settings.hub.generalDesc',
        accentClass: 'bg-primary/10 text-primary',
    },
    {
        id: 'profile',
        path: '/settings/profile',
        icon: 'person',
        titleKey: 'settings.hub.profile',
        descriptionKey: 'settings.hub.profileDesc',
        accentClass: 'bg-blue-500/10 text-blue-400',
    },
    {
        id: 'notifications',
        path: '/settings/notifications',
        icon: 'notifications',
        titleKey: 'settings.hub.notifications',
        descriptionKey: 'settings.hub.notificationsDesc',
        accentClass: 'bg-amber-500/10 text-amber-400',
    },
    {
        id: 'premium',
        path: '/settings/premium',
        icon: 'workspace_premium',
        titleKey: 'settings.hub.premium',
        descriptionKey: 'settings.hub.premiumDesc',
        accentClass: 'bg-orange-500/10 text-orange-400',
    },
    {
        id: 'guardian',
        path: '/settings/guardian',
        icon: 'shield_person',
        titleKey: 'settings.hub.guardian',
        descriptionKey: 'settings.hub.guardianDesc',
        accentClass: 'bg-emerald-500/10 text-emerald-400',
    },
    {
        id: 'commercial',
        path: '/settings/commercial',
        icon: 'storefront',
        titleKey: 'settings.hub.commercial',
        descriptionKey: 'settings.hub.commercialDesc',
        accentClass: 'bg-violet-500/10 text-violet-400',
    },
    {
        id: 'admin',
        path: '/settings/admin',
        icon: 'admin_panel_settings',
        titleKey: 'settings.hub.admin',
        descriptionKey: 'settings.hub.adminDesc',
        accentClass: 'bg-slate-500/10 text-slate-300',
    },
];

export interface SettingsAccess {
    sections: SettingsSection[];
    isGuest: boolean;
    userType: UserType;
    isPremium: boolean;
    canAccess: (sectionId: SettingsSectionId) => boolean;
}

export function useSettingsAccess(
    user: User | null | undefined,
    profile: Partial<UserProfile> | null | undefined
): SettingsAccess {
    return useMemo(() => {
        const guest = isGuestUser(user, profile);
        const { userType, isPremium } = getIdentityFromProfile(profile);

        const canAccess = (sectionId: SettingsSectionId) =>
            canAccessSection(sectionId, guest, userType, isPremium);

        const sections: SettingsSection[] = ALL_SECTIONS.filter((s) => canAccess(s.id)).map((s) => ({
            ...s,
            showPremiumBadge: s.id === 'premium' && isPremium,
        }));

        return { sections, isGuest: guest, userType, isPremium, canAccess };
    }, [user, profile]);
}
