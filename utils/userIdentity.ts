import type { UserProfile } from '../types/social';

/** Canonical user types (Rowy Single Select). */
export const USER_TYPES = [
    'Explorador',
    'Guardián Local',
    'CEO',
    'Team',
    'Aliado Comercial',
] as const;

export type UserType = (typeof USER_TYPES)[number];

export const DEFAULT_USER_TYPE: UserType = 'Explorador';

const USER_TYPE_FIELD_KEYS = ['userType', 'UserType', 'user_type', 'tipoUsuario'] as const;

const IGNORED_ROLE_VALUES = new Set(['user', 'premium', 'free', '']);

const LEGACY_USER_TYPE_MAP: Record<string, UserType> = {
    Free: 'Explorador',
    Premium: 'Explorador',
    Guardian: 'Guardián Local',
    'Guardián': 'Guardián Local',
    'Guardian Local': 'Guardián Local',
    Comercial: 'Aliado Comercial',
    'Aliado Comercial': 'Aliado Comercial',
    CEO: 'CEO',
    Team: 'Team',
    Explorador: 'Explorador',
    user: 'Explorador',
};

/** Coerce Rowy single-select / legacy shapes to a plain string. */
export function coerceScalarValue(raw: unknown): string | undefined {
    if (raw == null) return undefined;
    if (typeof raw === 'string') {
        const trimmed = raw.trim();
        return trimmed || undefined;
    }
    if (typeof raw === 'number' || typeof raw === 'boolean') {
        return String(raw);
    }
    if (Array.isArray(raw) && raw.length > 0) {
        return coerceScalarValue(raw[0]);
    }
    if (typeof raw === 'object') {
        const o = raw as Record<string, unknown>;
        for (const key of ['value', 'label', 'key', 'name', 'id', 'display', 'text']) {
            const v = o[key];
            if (typeof v === 'string' && v.trim()) return v.trim();
        }
    }
    return undefined;
}

function stripAccents(value: string): string {
    return value.normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

function matchCanonicalUserType(scalar: string): UserType | undefined {
    if ((USER_TYPES as readonly string[]).includes(scalar)) {
        return scalar as UserType;
    }
    const lower = scalar.toLowerCase();
    const byCase = USER_TYPES.find((t) => t.toLowerCase() === lower);
    if (byCase) return byCase;

    const normalizedInput = stripAccents(lower);
    const byAccent = USER_TYPES.find((t) => stripAccents(t.toLowerCase()) === normalizedInput);
    if (byAccent) return byAccent;

    return undefined;
}

/** Read userType from a Firestore user document (supports Rowy field names and legacy role). */
export function extractRawUserType(data: Record<string, unknown> | null | undefined): unknown {
    if (!data) return undefined;

    for (const key of USER_TYPE_FIELD_KEYS) {
        const value = data[key];
        if (value != null && value !== '') return value;
    }

    const roleScalar = coerceScalarValue(data.role);
    if (roleScalar && !IGNORED_ROLE_VALUES.has(roleScalar.toLowerCase())) {
        return roleScalar;
    }

    return undefined;
}

export interface UserIdentity {
    userType: UserType;
    isPremium: boolean;
}

/**
 * Diseño unificado light/dark: cada tarjeta es un gradiente de color elegante
 * aplicado vía estilo inline (no depende de Tailwind), con texto blanco.
 */
export interface UserTypeCardTheme {
    icon: string;
    decorIcon: string;
    badgeKey: string;
    cardGradient: string;
    iconGradient: string;
    accentStripe: string;
}

export interface PremiumCardTheme {
    icon: string;
    decorIcon: string;
    badgeKey?: string;
    cardGradient: string;
    iconGradient: string;
    accentStripe: string;
    cta?: boolean;
}

const g = (...stops: string[]) => `linear-gradient(135deg, ${stops.join(', ')})`;

const USER_TYPE_THEMES: Record<UserType, UserTypeCardTheme> = {
    Explorador: {
        icon: 'explore',
        decorIcon: 'landscape',
        badgeKey: 'profile.identity.badges.explorador',
        cardGradient: g('#d97706', '#b45309 55%', '#7c3d0a'),
        iconGradient: g('#fbbf24', '#f59e0b', '#b45309'),
        accentStripe: 'bg-amber-300',
    },
    'Guardián Local': {
        icon: 'shield_person',
        decorIcon: 'forest',
        badgeKey: 'profile.identity.badges.guardian',
        cardGradient: g('#059669', '#047857 55%', '#064e3b'),
        iconGradient: g('#34d399', '#10b981', '#047857'),
        accentStripe: 'bg-emerald-300',
    },
    CEO: {
        icon: 'corporate_fare',
        decorIcon: 'domain',
        badgeKey: 'profile.identity.badges.ceo',
        // Plateado / platino elegante
        cardGradient: g('#7c8aa3', '#56657d 50%', '#2b3445'),
        iconGradient: g('#e2e8f0', '#aab6c7', '#64748b'),
        accentStripe: 'bg-slate-300',
    },
    Team: {
        icon: 'groups',
        decorIcon: 'diversity_3',
        badgeKey: 'profile.identity.badges.team',
        cardGradient: g('#2563eb', '#1d4ed8 55%', '#1e3a8a'),
        iconGradient: g('#60a5fa', '#3b82f6', '#1d4ed8'),
        accentStripe: 'bg-blue-300',
    },
    'Aliado Comercial': {
        icon: 'storefront',
        decorIcon: 'handshake',
        badgeKey: 'profile.identity.badges.comercial',
        cardGradient: g('#0891b2', '#0e7490 55%', '#155e63'),
        iconGradient: g('#22d3ee', '#06b6d4', '#0e7490'),
        accentStripe: 'bg-cyan-300',
    },
};

export const PREMIUM_CARD_THEMES = {
    active: {
        icon: 'workspace_premium',
        decorIcon: 'stars',
        badgeKey: 'profile.identity.badges.pro',
        cardGradient: g('#c79a1e', '#a87a12 50%', '#6b4e0a'),
        iconGradient: g('#fcd34d', '#f59e0b', '#b45309'),
        accentStripe: 'bg-amber-300',
    },
    inactive: {
        icon: 'lock',
        decorIcon: 'workspace_premium',
        cardGradient: g('#3b475e', '#2b3446 55%', '#1c2434'),
        iconGradient: g('#64748b', '#FF6B35', '#9a3412'),
        accentStripe: 'bg-primary',
        cta: true,
    },
} satisfies Record<'active' | 'inactive', PremiumCardTheme>;

export function getUserTypeTheme(userType: UserType): UserTypeCardTheme {
    return USER_TYPE_THEMES[userType];
}

export function getPremiumCardTheme(isPremium: boolean): PremiumCardTheme {
    return isPremium ? PREMIUM_CARD_THEMES.active : PREMIUM_CARD_THEMES.inactive;
}

export function normalizeUserType(raw: unknown): UserType {
    const scalar = coerceScalarValue(raw);
    if (!scalar) return DEFAULT_USER_TYPE;

    const canonical = matchCanonicalUserType(scalar);
    if (canonical) return canonical;

    return LEGACY_USER_TYPE_MAP[scalar] ?? DEFAULT_USER_TYPE;
}

const IS_PREMIUM_FIELD_KEYS = ['isPremium', 'is_premium', 'IsPremium'] as const;

export function extractRawIsPremium(data: Record<string, unknown> | null | undefined): unknown {
    if (!data) return undefined;
    for (const key of IS_PREMIUM_FIELD_KEYS) {
        const value = data[key];
        if (value !== undefined && value !== null && value !== '') return value;
    }
    return undefined;
}

export function normalizeIsPremium(raw: unknown, legacyRole?: unknown): boolean {
    if (typeof raw === 'boolean') return raw;
    const scalar = coerceScalarValue(raw);
    if (scalar === 'true' || scalar === '1') return true;
    if (scalar === 'false' || scalar === '0') return false;
    if (raw === 1) return true;
    if (raw === 0) return false;
    const roleScalar = coerceScalarValue(legacyRole);
    if (roleScalar?.toLowerCase() === 'premium') return true;
    return false;
}

export function getIdentityFromProfile(
    profile: Partial<UserProfile> | null | undefined
): UserIdentity {
    if (!profile) {
        return { userType: DEFAULT_USER_TYPE, isPremium: false };
    }
    const record = profile as Record<string, unknown>;
    const legacyRole = record.role;
    return {
        userType: normalizeUserType(extractRawUserType(record)),
        isPremium: normalizeIsPremium(extractRawIsPremium(record), legacyRole),
    };
}

export const NEW_USER_IDENTITY_FIELDS = {
    userType: DEFAULT_USER_TYPE,
    isPremium: false,
} as const;

/** Firestore fields for hackathon / demo anonymous explorers (see loginAsGuest). */
export const GUEST_USER_PROFILE_FIELDS = {
    userType: DEFAULT_USER_TYPE,
    isPremium: true,
    isGuest: true,
    pactAccepted: true,
} as const;

export function isGuestProfile(profile: Partial<UserProfile> | null | undefined): boolean {
    if (!profile) return false;
    const record = profile as Record<string, unknown>;
    return record.isGuest === true;
}
