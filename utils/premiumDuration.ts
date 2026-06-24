/**
 * Rowy Duration field + legacy Timestamp shapes for `users.premiumExpiresAt`.
 * Duration stores `{ startDate, endDate }` or `{ start, end }` (Firestore Timestamps).
 */

export interface PremiumDuration {
    start: Date | null;
    end: Date | null;
}

export function parseFirestoreLikeDate(
    raw: unknown
): Date | null {
    if (!raw) return null;
    if (raw instanceof Date) return raw;
    if (typeof raw === 'object' && raw !== null) {
        const obj = raw as Record<string, unknown>;
        if (typeof obj.toDate === 'function') {
            return (obj.toDate as () => Date)();
        }
        if (obj.seconds != null) {
            const ms = Number(obj.seconds) * 1000 + Number(obj.nanoseconds || 0) / 1e6;
            const d = new Date(ms);
            return Number.isNaN(d.getTime()) ? null : d;
        }
    }
    if (typeof raw === 'string' || typeof raw === 'number') {
        const d = new Date(raw);
        return Number.isNaN(d.getTime()) ? null : d;
    }
    return null;
}

/** Parses Rowy Duration or a plain expiry Timestamp. */
export function parsePremiumDuration(raw: unknown): PremiumDuration | null {
    if (!raw) return null;

    if (typeof raw === 'object' && raw !== null) {
        const obj = raw as Record<string, unknown>;
        const hasDurationKeys =
            'startDate' in obj ||
            'endDate' in obj ||
            'start' in obj ||
            'end' in obj;

        if (hasDurationKeys) {
            return {
                start: parseFirestoreLikeDate(obj.startDate ?? obj.start),
                end: parseFirestoreLikeDate(obj.endDate ?? obj.end),
            };
        }

        const asDate = parseFirestoreLikeDate(raw);
        if (asDate) return { start: null, end: asDate };
    }

    const end = parseFirestoreLikeDate(raw);
    return end ? { start: null, end } : null;
}

/** Expiry instant used by entitlement checks (Duration end, or legacy Timestamp). */
export function getPremiumExpiryDate(raw: unknown): Date | null {
    const duration = parsePremiumDuration(raw);
    return duration?.end ?? null;
}

export function hasActivePremiumWindow(raw: unknown, now = Date.now()): boolean {
    const end = getPremiumExpiryDate(raw);
    if (!end) return true;
    return end.getTime() > now;
}

export function buildPremiumDurationPayload(
    start: Date,
    end: Date
): { startDate: Date; endDate: Date } {
    return { startDate: start, endDate: end };
}
