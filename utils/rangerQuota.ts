import { RANGER_FREE_DAILY, RANGER_PREMIUM_DAILY } from '../config/premiumLimits';
import { GUEST_HACKATHON_PREMIUM } from './guestAccess';
import { hasActivePremium, type PremiumProfileFields } from './premiumAccess';
import { isGuestProfile } from './userIdentity';

function todayUtcDateKey(): string {
    return new Date().toISOString().slice(0, 10);
}

export function getRangerDailyLimit(profile: PremiumProfileFields | null | undefined): number | null {
    if (GUEST_HACKATHON_PREMIUM && isGuestProfile(profile)) return RANGER_PREMIUM_DAILY;
    if (hasActivePremium(profile)) return RANGER_PREMIUM_DAILY;
    return RANGER_FREE_DAILY;
}

export function computeRangerQuota(profile: PremiumProfileFields | null | undefined): {
    limit: number;
    used: number;
    remaining: number;
    allowed: boolean;
    date: string;
    unlimited: boolean;
} {
    const date = todayUtcDateKey();
    const limit = getRangerDailyLimit(profile);

    if (limit === null) {
        return { limit: 0, used: 0, remaining: 0, allowed: true, date, unlimited: true };
    }

    const usage = profile?.rangerUsage;
    const used = usage?.date === date ? Math.max(0, Math.floor(usage.count ?? 0)) : 0;
    const remaining = Math.max(0, limit - used);

    return { limit, used, remaining, allowed: remaining > 0, date, unlimited: false };
}
