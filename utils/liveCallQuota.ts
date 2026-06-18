import {
    LIVE_PERIOD_MS,
    LIVE_PREMIUM_MONTHLY_SECONDS,
    LIVE_TRIAL_SECONDS,
} from '../config/premiumLimits';
import { hasActivePremium, parseProfileDate, type PremiumProfileFields } from './premiumAccess';
import { isGuestProfile } from './userIdentity';

export interface LiveCallUsageRaw {
    periodStart?: { toDate?: () => Date } | string | number;
    usedSeconds?: number;
}

export interface LiveCallQuotaState {
    periodStart: Date;
    usedSeconds: number;
    remainingSeconds: number;
    limitSeconds: number;
    periodEndsAt: Date;
    isBlocked: boolean;
    isTrial: boolean;
    requiresPremium: boolean;
}

export function parsePeriodStart(raw: LiveCallUsageRaw['periodStart']): Date {
    return parseProfileDate(raw) ?? new Date();
}

export function computeLiveCallQuota(
    profile?: PremiumProfileFields | null
): LiveCallQuotaState {
    const now = Date.now();

    if (isGuestProfile(profile)) {
        const periodEndsAt = new Date(now + LIVE_PERIOD_MS);
        return {
            periodStart: new Date(now),
            usedSeconds: 0,
            remainingSeconds: LIVE_PREMIUM_MONTHLY_SECONDS,
            limitSeconds: LIVE_PREMIUM_MONTHLY_SECONDS,
            periodEndsAt,
            isBlocked: false,
            isTrial: false,
            requiresPremium: false,
        };
    }

    if (hasActivePremium(profile)) {
        const limitSeconds = LIVE_PREMIUM_MONTHLY_SECONDS;
        let periodStart = parsePeriodStart(profile?.liveCallUsage?.periodStart);
        let usedSeconds = Math.max(0, Math.floor(profile?.liveCallUsage?.usedSeconds ?? 0));

        if (now - periodStart.getTime() >= LIVE_PERIOD_MS) {
            periodStart = new Date(now);
            usedSeconds = 0;
        }

        const periodEndsAt = new Date(periodStart.getTime() + LIVE_PERIOD_MS);
        const remainingSeconds = Math.max(0, limitSeconds - usedSeconds);

        return {
            periodStart,
            usedSeconds,
            remainingSeconds,
            limitSeconds,
            periodEndsAt,
            isBlocked: remainingSeconds <= 0,
            isTrial: false,
            requiresPremium: false,
        };
    }

    const trialUsed = Math.max(0, Math.floor(profile?.liveTrialUsedSeconds ?? 0));
    const remainingSeconds = Math.max(0, LIVE_TRIAL_SECONDS - trialUsed);

    return {
        periodStart: new Date(now),
        usedSeconds: trialUsed,
        remainingSeconds,
        limitSeconds: LIVE_TRIAL_SECONDS,
        periodEndsAt: new Date(now + 365 * 24 * 60 * 60 * 1000),
        isBlocked: remainingSeconds <= 0,
        isTrial: true,
        requiresPremium: remainingSeconds <= 0,
    };
}

export function formatLiveMinutesSeconds(totalSeconds: number): string {
    const s = Math.max(0, Math.floor(totalSeconds));
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
}

export function formatLiveMinutes(totalSeconds: number): string {
    const m = Math.ceil(Math.max(0, totalSeconds) / 60);
    return String(m);
}

// Legacy export for config/constants.ts
export const LIVE_CALL_MONTHLY_LIMIT_SECONDS = LIVE_PREMIUM_MONTHLY_SECONDS;
