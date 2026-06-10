import React, { useMemo } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import type { UserProfile } from '../../types/social';
import {
    extractRawIsPremium,
    extractRawUserType,
    getIdentityFromProfile,
    getPremiumCardTheme,
    getUserTypeTheme,
    type UserType,
    type UserTypeCardTheme,
    type PremiumCardTheme,
} from '../../utils/userIdentity';

interface ProfileUserIdentityCardsProps {
    profile: UserProfile | null;
    onPremiumClick?: () => void;
}

const USER_TYPE_I18N_KEY: Record<UserType, string> = {
    Explorador: 'profile.identity.types.explorador',
    'Guardián Local': 'profile.identity.types.guardian',
    CEO: 'profile.identity.types.ceo',
    Team: 'profile.identity.types.team',
    'Aliado Comercial': 'profile.identity.types.comercial',
};

const USER_TYPE_DESC_KEY: Record<UserType, string> = {
    Explorador: 'profile.identity.descriptions.explorador',
    'Guardián Local': 'profile.identity.descriptions.guardian',
    CEO: 'profile.identity.descriptions.ceo',
    Team: 'profile.identity.descriptions.team',
    'Aliado Comercial': 'profile.identity.descriptions.comercial',
};

function CardGlowOrbs() {
    return (
        <>
            <div className="absolute -top-12 -right-10 size-40 rounded-full blur-3xl pointer-events-none bg-white/15" />
            <div className="absolute -bottom-16 -left-10 size-44 rounded-full blur-3xl pointer-events-none bg-black/20" />
        </>
    );
}

function IdentityIconShell({ icon, gradient }: { icon: string; gradient: string }) {
    return (
        <div
            className="relative size-12 shrink-0 rounded-2xl flex items-center justify-center overflow-hidden shadow-lg shadow-black/25 ring-1 ring-white/20"
            style={{ backgroundImage: gradient }}
        >
            <div
                className="absolute inset-0 pointer-events-none bg-gradient-to-br from-white/40 via-white/5 to-transparent"
                aria-hidden
            />
            <span className="material-symbols-outlined text-[28px] relative z-[1] text-white drop-shadow-sm filled-icon">
                {icon}
            </span>
        </div>
    );
}

function PremiumStatusToggle({
    isPremium,
    offLabel,
    onLabel,
}: {
    isPremium: boolean;
    offLabel: string;
    onLabel: string;
}) {
    return (
        <div className="flex flex-col items-center gap-1 shrink-0" aria-hidden>
            <div
                className={`relative w-11 h-6 rounded-full p-0.5 flex items-center transition-colors border ${
                    isPremium
                        ? 'bg-emerald-400/90 border-emerald-200/60 justify-end'
                        : 'bg-black/40 border-white/30 justify-start'
                }`}
                role="presentation"
            >
                <div className="size-5 rounded-full bg-white shadow-md shadow-black/30" />
            </div>
            <span
                className={`text-[8px] font-black uppercase tracking-widest leading-none ${
                    isPremium ? 'text-emerald-100' : 'text-white/70'
                }`}
            >
                {isPremium ? onLabel : offLabel}
            </span>
        </div>
    );
}

function UserTypeIdentityCard({
    theme,
    typeLabel,
    description,
    badgeLabel,
    labelText,
}: {
    theme: UserTypeCardTheme;
    typeLabel: string;
    description: string;
    badgeLabel: string;
    labelText: string;
}) {
    return (
        <div
            className="relative overflow-hidden rounded-2xl p-4 pl-5 shadow-lg shadow-black/20"
            style={{ backgroundImage: theme.cardGradient }}
        >
            <CardGlowOrbs />
            <div
                className={`absolute left-0 top-4 bottom-4 w-1 rounded-full ${theme.accentStripe} opacity-90 pointer-events-none`}
            />
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-white/15 via-transparent to-black/25" />
            <span
                className="material-symbols-outlined absolute -right-3 -bottom-4 text-[96px] leading-none pointer-events-none select-none text-white/10"
                aria-hidden
            >
                {theme.decorIcon}
            </span>
            <div className="relative z-[1] flex items-start gap-3">
                <IdentityIconShell icon={theme.icon} gradient={theme.iconGradient} />
                <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                        <p className="text-[9px] font-black uppercase tracking-widest text-white/70 leading-snug">
                            {labelText}
                        </p>
                        <span className="shrink-0 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest bg-white/15 text-white border border-white/25 backdrop-blur-sm">
                            {badgeLabel}
                        </span>
                    </div>
                    <p className="text-lg font-extrabold leading-tight text-white break-words">
                        {typeLabel}
                    </p>
                    <p className="text-[10px] font-medium leading-snug text-white/80">
                        {description}
                    </p>
                </div>
            </div>
        </div>
    );
}

function PremiumIdentityCard({
    theme,
    isPremium,
    isClickable,
    onPremiumClick,
    labelText,
    titleText,
    description,
    ctaText,
    badgeLabel,
    toggleOffLabel,
    toggleOnLabel,
}: {
    theme: PremiumCardTheme;
    isPremium: boolean;
    isClickable: boolean;
    onPremiumClick?: () => void;
    labelText: string;
    titleText: string;
    description: string;
    ctaText?: string;
    badgeLabel?: string;
    toggleOffLabel: string;
    toggleOnLabel: string;
}) {
    const content = (
        <>
            <CardGlowOrbs />
            <div
                className={`absolute left-0 top-4 bottom-4 w-1 rounded-full ${theme.accentStripe} opacity-90 pointer-events-none`}
            />
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-white/15 via-transparent to-black/25" />
            <span
                className="material-symbols-outlined absolute -right-2 -bottom-3 text-[88px] leading-none pointer-events-none select-none text-white/10"
                aria-hidden
            >
                {theme.decorIcon}
            </span>
            <div className="relative z-[1] flex items-start gap-3">
                <IdentityIconShell icon={theme.icon} gradient={theme.iconGradient} />
                <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                        <p className="text-[9px] font-black uppercase tracking-widest text-white/70 leading-snug min-w-0">
                            {labelText}
                        </p>
                        {badgeLabel && isPremium && (
                            <span className="shrink-0 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tighter bg-white/20 text-white border border-white/30 backdrop-blur-sm animate-pulse">
                                {badgeLabel}
                            </span>
                        )}
                    </div>
                    <p className="text-lg font-extrabold leading-tight text-white break-words">
                        {titleText}
                    </p>
                    <p className="text-[10px] font-medium leading-snug text-white/80">
                        {description}
                    </p>
                    {ctaText && (
                        <p className="text-[9px] font-black uppercase tracking-wider text-amber-300">
                            {ctaText}
                        </p>
                    )}
                </div>
                <div className="flex flex-col items-center gap-1 shrink-0 self-center">
                    <PremiumStatusToggle
                        isPremium={isPremium}
                        offLabel={toggleOffLabel}
                        onLabel={toggleOnLabel}
                    />
                    {!isPremium && isClickable && (
                        <span className="material-symbols-outlined text-white/80 text-lg">chevron_right</span>
                    )}
                    {isPremium && (
                        <span className="material-symbols-outlined text-xl filled-icon text-white/85">
                            verified
                        </span>
                    )}
                </div>
            </div>
        </>
    );

    const base = 'relative overflow-hidden rounded-2xl p-4 pl-5 shadow-lg shadow-black/20';

    if (isClickable && onPremiumClick) {
        return (
            <button
                type="button"
                onClick={onPremiumClick}
                className={`w-full text-left ${base} active:scale-[0.98] cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-white/40`}
                style={{ backgroundImage: theme.cardGradient }}
            >
                {content}
            </button>
        );
    }

    return <div className={base} style={{ backgroundImage: theme.cardGradient }}>{content}</div>;
}

export const ProfileUserIdentityCards: React.FC<ProfileUserIdentityCardsProps> = ({
    profile,
    onPremiumClick,
}) => {
    const { t } = useTranslation();

    const record = profile as Record<string, unknown> | null;
    const rawUserType = record ? extractRawUserType(record) : undefined;
    const rawIsPremium = record ? extractRawIsPremium(record) : undefined;
    const legacyRole = record?.role;

    const identity = useMemo(
        () => getIdentityFromProfile(profile),
        [profile, rawUserType, rawIsPremium, legacyRole]
    );

    const userTheme = getUserTypeTheme(identity.userType);
    const premiumTheme = getPremiumCardTheme(identity.isPremium);
    const isPremiumClickable = !identity.isPremium && Boolean(onPremiumClick);

    return (
        <section className="flex flex-col gap-3" aria-label={t('profile.identity.sectionTitle')}>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-content-subtle px-0.5">
                {t('profile.identity.sectionTitle')}
            </p>

            <div className="grid grid-cols-1 gap-3 mobile-single-col">
                <UserTypeIdentityCard
                    theme={userTheme}
                    labelText={t('profile.identity.userTypeLabel')}
                    typeLabel={t(USER_TYPE_I18N_KEY[identity.userType])}
                    description={t(USER_TYPE_DESC_KEY[identity.userType])}
                    badgeLabel={t(userTheme.badgeKey)}
                />

                <PremiumIdentityCard
                    theme={premiumTheme}
                    isPremium={identity.isPremium}
                    isClickable={isPremiumClickable}
                    onPremiumClick={onPremiumClick}
                    badgeLabel={premiumTheme.badgeKey ? t(premiumTheme.badgeKey) : undefined}
                    toggleOffLabel={t('profile.identity.toggleOff')}
                    toggleOnLabel={t('profile.identity.toggleOn')}
                    labelText={t('profile.identity.premiumLabel')}
                    titleText={
                        identity.isPremium
                            ? t('profile.identity.premiumActive')
                            : t('profile.identity.premiumInactive')
                    }
                    description={
                        identity.isPremium
                            ? t('profile.identity.premiumActiveDesc')
                            : t('profile.identity.premiumInactiveDesc')
                    }
                    ctaText={isPremiumClickable ? t('profile.identity.tapToActivate') : undefined}
                />
            </div>
        </section>
    );
};
