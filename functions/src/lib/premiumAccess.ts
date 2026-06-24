import type { Timestamp } from "firebase-admin/firestore";
import {
    EXPEDITION_MONTHLY_QUOTA,
    EXPEDITION_PASS_QUOTA,
    TRIP_PASS_DURATION_MS,
} from "./premiumLimits";
import { getPremiumExpiryDate } from "./premiumDuration";

export interface UserPremiumFields {
    isPremium?: boolean;
    isGuest?: boolean;
    premiumPlan?: "trip_pass" | "monthly" | "annual" | "lifetime" | string;
    premiumExpiresAt?: Timestamp | { toDate?: () => Date };
}

export function parseFirestoreDate(
    raw: Timestamp | { toDate?: () => Date } | Date | string | number | undefined | null
): Date | null {
    if (!raw) return null;
    if (raw instanceof Date) return raw;
    if (typeof raw === "object" && raw !== null && "toDate" in raw && typeof raw.toDate === "function") {
        return raw.toDate();
    }
    if (typeof raw === "string" || typeof raw === "number") {
        const d = new Date(raw);
        return Number.isNaN(d.getTime()) ? null : d;
    }
    return null;
}

/** Hackathon evaluators: guest profile is treated as full Premium until post-hackathon. */
export function isHackathonGuest(data: UserPremiumFields | null | undefined): boolean {
    return data?.isGuest === true;
}

/**
 * Active paid Premium (or hackathon guest).
 * Respects `premiumExpiresAt` for trip pass expiry.
 */
export function hasActivePremium(data: UserPremiumFields | null | undefined): boolean {
    if (!data) return false;
    if (isHackathonGuest(data)) return true;
    if (data.isPremium !== true) return false;

    const expires = getPremiumExpiryDate(data.premiumExpiresAt);
    if (expires && expires.getTime() < Date.now()) return false;
    return true;
}

/** Trip pass = the `trip_pass` plan (legacy: any finite `premiumExpiresAt` window ~10 days). */
export function isTripPassPlan(data: UserPremiumFields | null | undefined): boolean {
    if (!hasActivePremium(data) || isHackathonGuest(data)) return false;
    const plan = String(data?.premiumPlan || "").toLowerCase();
    if (plan === "trip_pass") return true;
    if (plan === "monthly" || plan === "annual" || plan === "lifetime") return false;
    // Legacy docs without `premiumPlan`: infer a trip pass from a finite expiry window.
    return Boolean(getPremiumExpiryDate(data?.premiumExpiresAt));
}

export function getExpeditionQuotaLimit(data: UserPremiumFields | null | undefined): number {
    if (isHackathonGuest(data)) return EXPEDITION_MONTHLY_QUOTA;
    if (!hasActivePremium(data)) return 0;
    return isTripPassPlan(data) ? EXPEDITION_PASS_QUOTA : EXPEDITION_MONTHLY_QUOTA;
}

export function getTripPassPeriodStart(expiresAt: Date): Date {
    return new Date(expiresAt.getTime() - TRIP_PASS_DURATION_MS);
}
