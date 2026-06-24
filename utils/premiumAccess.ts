import {
    EXPEDITION_MONTHLY_QUOTA,
    EXPEDITION_PASS_QUOTA,
    EXPEDITION_PERIOD_MS,
    TRIP_PASS_DURATION_MS,
} from '../config/premiumLimits';
import {
    extractRawIsPremium,
    isGuestProfile,
    normalizeIsPremium,
} from './userIdentity';
import { getPremiumExpiryDate } from './premiumDuration';

export interface PremiumProfileFields {
    isPremium?: boolean;
    isGuest?: boolean;
    premiumPlan?: 'trip_pass' | 'monthly' | 'annual' | 'lifetime' | string;
    premiumExpiresAt?: { toDate?: () => Date } | string | Date | number;
    expeditionPlansUsed?: {
        periodStart?: { toDate?: () => Date } | string | number;
        count?: number;
    };
    liveTrialUsedSeconds?: number;
    liveCallUsage?: {
        periodStart?: { toDate?: () => Date } | string | number;
        usedSeconds?: number;
    };
    rangerUsage?: { date?: string; count?: number };
}

export function parseProfileDate(
    raw: PremiumProfileFields['premiumExpiresAt']
): Date | null {
    return getPremiumExpiryDate(raw);
}

/** Hackathon guest = full Premium until post-hackathon (see GUEST_USER_PROFILE_FIELDS). */
export function hasActivePremium(profile: PremiumProfileFields | null | undefined): boolean {
    if (!profile) return false;
    if (isGuestProfile(profile)) return true;
    const record = profile as Record<string, unknown>;
    if (!normalizeIsPremium(extractRawIsPremium(record), record.role)) return false;
    const expires = parseProfileDate(profile.premiumExpiresAt);
    if (expires && expires.getTime() < Date.now()) return false;
    return true;
}

export function isTripPassPlan(profile: PremiumProfileFields | null | undefined): boolean {
    if (!hasActivePremium(profile) || isGuestProfile(profile)) return false;
    const plan = String(profile?.premiumPlan || '').toLowerCase();
    if (plan === 'trip_pass') return true;
    if (plan === 'monthly' || plan === 'annual' || plan === 'lifetime') return false;
    // Legacy docs without `premiumPlan`: infer a trip pass from a finite expiry window.
    return Boolean(parseProfileDate(profile?.premiumExpiresAt));
}

export function getExpeditionQuotaLimit(profile: PremiumProfileFields | null | undefined): number {
    if (isGuestProfile(profile)) return EXPEDITION_MONTHLY_QUOTA;
    if (!hasActivePremium(profile)) return 0;
    return isTripPassPlan(profile) ? EXPEDITION_PASS_QUOTA : EXPEDITION_MONTHLY_QUOTA;
}

export function computeExpeditionQuotaDisplay(profile: PremiumProfileFields | null | undefined): {
    limit: number;
    used: number;
    remaining: number;
    allowed: boolean;
    requiresPremium: boolean;
} {
    const limit = getExpeditionQuotaLimit(profile);
    const requiresPremium = !hasActivePremium(profile);

    if (requiresPremium) {
        return { limit: 0, used: 0, remaining: 0, allowed: false, requiresPremium: true };
    }

    const now = Date.now();
    const expires = parseProfileDate(profile?.premiumExpiresAt);
    let periodStart: Date;
    let periodEnd: Date;

    if (isTripPassPlan(profile) && expires) {
        periodStart = new Date(expires.getTime() - TRIP_PASS_DURATION_MS);
        periodEnd = expires;
    } else {
        const usageStart = parseProfileDate(profile?.expeditionPlansUsed?.periodStart);
        periodStart = usageStart ?? new Date(now);
        periodEnd = new Date(periodStart.getTime() + EXPEDITION_PERIOD_MS);
        if (now >= periodEnd.getTime()) {
            periodStart = new Date(now);
            periodEnd = new Date(periodStart.getTime() + EXPEDITION_PERIOD_MS);
        }
    }

    const usage = profile?.expeditionPlansUsed;
    let used = Math.max(0, Math.floor(usage?.count ?? 0));
    const usageStart = parseProfileDate(usage?.periodStart);
    if (!usageStart || usageStart.getTime() !== periodStart.getTime()) {
        used = 0;
    }

    const remaining = Math.max(0, limit - used);
    return {
        limit,
        used,
        remaining,
        allowed: remaining > 0,
        requiresPremium: false,
    };
}
