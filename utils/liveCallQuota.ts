/** 30 minutes per rolling 30-day period (MVP — all users) */
export const LIVE_CALL_MONTHLY_LIMIT_SECONDS = 30 * 60;
export const LIVE_CALL_PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

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
}

export function parsePeriodStart(raw: LiveCallUsageRaw['periodStart']): Date {
    if (!raw) return new Date();
    if (typeof raw === 'object' && raw !== null && 'toDate' in raw && typeof raw.toDate === 'function') {
        return raw.toDate();
    }
    if (typeof raw === 'number') return new Date(raw);
    if (typeof raw === 'string') return new Date(raw);
    return new Date();
}

export function computeLiveCallQuota(usage?: LiveCallUsageRaw | null): LiveCallQuotaState {
    const now = Date.now();
    const limitSeconds = LIVE_CALL_MONTHLY_LIMIT_SECONDS;
    let periodStart = parsePeriodStart(usage?.periodStart);
    let usedSeconds = Math.max(0, Math.floor(usage?.usedSeconds ?? 0));

    if (now - periodStart.getTime() >= LIVE_CALL_PERIOD_MS) {
        periodStart = new Date(now);
        usedSeconds = 0;
    }

    const periodEndsAt = new Date(periodStart.getTime() + LIVE_CALL_PERIOD_MS);
    const remainingSeconds = Math.max(0, limitSeconds - usedSeconds);

    return {
        periodStart,
        usedSeconds,
        remainingSeconds,
        limitSeconds,
        periodEndsAt,
        isBlocked: remainingSeconds <= 0,
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
