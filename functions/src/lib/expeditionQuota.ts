import type { Firestore } from "firebase-admin/firestore";
import { Timestamp } from "firebase-admin/firestore";
import {
    getExpeditionQuotaLimit,
    getTripPassPeriodStart,
    hasActivePremium,
    isHackathonGuest,
    isTripPassPlan,
    parseFirestoreDate,
} from "./premiumAccess";
import { EXPEDITION_PERIOD_MS } from "./premiumLimits";

export interface ExpeditionPlansUsageDoc {
    periodStart?: Timestamp | { toDate?: () => Date };
    count?: number;
}

export interface ExpeditionQuotaState {
    allowed: boolean;
    limit: number;
    used: number;
    remaining: number;
    periodEndsAt: Date;
    resetAt: string;
    reason?: "PREMIUM_REQUIRED" | "EXPEDITION_QUOTA_EXCEEDED";
}

function resolvePeriodWindow(
    userData: Record<string, unknown> | undefined,
    now = Date.now()
): { periodStart: Date; periodEndsAt: Date } {
    const expiresAt = parseFirestoreDate(
        userData?.premiumExpiresAt as ExpeditionPlansUsageDoc["periodStart"]
    );

    if (isTripPassPlan(userData) && expiresAt) {
        return { periodStart: getTripPassPeriodStart(expiresAt), periodEndsAt: expiresAt };
    }

    const usage = userData?.expeditionPlansUsed as ExpeditionPlansUsageDoc | undefined;
    let periodStart = parseFirestoreDate(usage?.periodStart) ?? new Date(now);
    let periodEndsAt = new Date(periodStart.getTime() + EXPEDITION_PERIOD_MS);

    if (now >= periodEndsAt.getTime()) {
        periodStart = new Date(now);
        periodEndsAt = new Date(periodStart.getTime() + EXPEDITION_PERIOD_MS);
    }

    return { periodStart, periodEndsAt };
}

export function computeExpeditionQuota(
    userData: Record<string, unknown> | null | undefined
): ExpeditionQuotaState {
    const now = Date.now();

    if (isHackathonGuest(userData ?? undefined)) {
        const periodEndsAt = new Date(now + EXPEDITION_PERIOD_MS);
        return {
            allowed: true,
            limit: getExpeditionQuotaLimit(userData ?? undefined),
            used: 0,
            remaining: getExpeditionQuotaLimit(userData ?? undefined),
            periodEndsAt,
            resetAt: periodEndsAt.toISOString(),
        };
    }

    if (!hasActivePremium(userData ?? undefined)) {
        const periodEndsAt = new Date(now + EXPEDITION_PERIOD_MS);
        return {
            allowed: false,
            limit: 0,
            used: 0,
            remaining: 0,
            periodEndsAt,
            resetAt: periodEndsAt.toISOString(),
            reason: "PREMIUM_REQUIRED",
        };
    }

    const limit = getExpeditionQuotaLimit(userData ?? undefined);
    const { periodStart, periodEndsAt } = resolvePeriodWindow(userData ?? undefined, now);
    const usage = userData?.expeditionPlansUsed as ExpeditionPlansUsageDoc | undefined;
    let used = Math.max(0, Math.floor(usage?.count ?? 0));

    const usageStart = parseFirestoreDate(usage?.periodStart);
    if (!usageStart || usageStart.getTime() !== periodStart.getTime()) {
        if (now >= periodStart.getTime() && now < periodEndsAt.getTime()) {
            used = 0;
        }
    }

    const remaining = Math.max(0, limit - used);

    return {
        allowed: remaining > 0,
        limit,
        used,
        remaining,
        periodEndsAt,
        resetAt: periodEndsAt.toISOString(),
        reason: remaining <= 0 ? "EXPEDITION_QUOTA_EXCEEDED" : undefined,
    };
}

export async function assertExpeditionQuota(
    db: Firestore,
    userId: string
): Promise<ExpeditionQuotaState> {
    const snap = await db.collection("users").doc(userId).get();
    return computeExpeditionQuota(snap.data());
}

export async function consumeExpeditionQuota(db: Firestore, userId: string): Promise<void> {
    const userRef = db.collection("users").doc(userId);

    await db.runTransaction(async (tx) => {
        const snap = await tx.get(userRef);
        const data = snap.data() ?? {};
        if (isHackathonGuest(data)) return;

        const quota = computeExpeditionQuota(data);
        if (!quota.allowed) {
            throw new Error(quota.reason ?? "EXPEDITION_QUOTA_EXCEEDED");
        }

        const { periodStart } = resolvePeriodWindow(data);
        const usage = data.expeditionPlansUsed as ExpeditionPlansUsageDoc | undefined;
        let used = Math.max(0, Math.floor(usage?.count ?? 0));
        const usageStart = parseFirestoreDate(usage?.periodStart);

        if (!usageStart || usageStart.getTime() !== periodStart.getTime()) {
            used = 0;
        }

        tx.set(
            userRef,
            {
                expeditionPlansUsed: {
                    periodStart: Timestamp.fromDate(periodStart),
                    count: used + 1,
                    lastUpdated: Timestamp.now(),
                },
            },
            { merge: true }
        );
    });
}
