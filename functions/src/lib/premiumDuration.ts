import type { Timestamp } from "firebase-admin/firestore";

export interface PremiumDuration {
    start: Date | null;
    end: Date | null;
}

export function parseFirestoreLikeDate(
    raw: Timestamp | { toDate?: () => Date } | Date | string | number | undefined | null
): Date | null {
    if (!raw) return null;
    if (raw instanceof Date) return raw;
    if (typeof raw === "object" && raw !== null && "toDate" in raw && typeof raw.toDate === "function") {
        return raw.toDate();
    }
    if (typeof raw === "object" && raw !== null) {
        const obj = raw as Record<string, unknown>;
        if (obj.seconds != null) {
            const ms = Number(obj.seconds) * 1000 + Number(obj.nanoseconds || 0) / 1e6;
            const d = new Date(ms);
            return Number.isNaN(d.getTime()) ? null : d;
        }
    }
    if (typeof raw === "string" || typeof raw === "number") {
        const d = new Date(raw);
        return Number.isNaN(d.getTime()) ? null : d;
    }
    return null;
}

export function parsePremiumDuration(raw: unknown): PremiumDuration | null {
    if (!raw) return null;

    if (typeof raw === "object" && raw !== null) {
        const obj = raw as Record<string, unknown>;
        const hasDurationKeys =
            "startDate" in obj ||
            "endDate" in obj ||
            "start" in obj ||
            "end" in obj;

        if (hasDurationKeys) {
            return {
                start: parseFirestoreLikeDate(obj.startDate ?? obj.start as Timestamp),
                end: parseFirestoreLikeDate(obj.endDate ?? obj.end as Timestamp),
            };
        }

        const asDate = parseFirestoreLikeDate(raw as Timestamp);
        if (asDate) return { start: null, end: asDate };
    }

    const end = parseFirestoreLikeDate(raw as Timestamp);
    return end ? { start: null, end } : null;
}

export function getPremiumExpiryDate(raw: unknown): Date | null {
    return parsePremiumDuration(raw)?.end ?? null;
}

export function hasValidFuturePremiumEnd(raw: unknown, now = Date.now()): boolean {
    const end = getPremiumExpiryDate(raw);
    return Boolean(end && end.getTime() > now);
}
