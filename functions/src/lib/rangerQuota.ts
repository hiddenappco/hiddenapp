import type { Firestore } from "firebase-admin/firestore";
import { Timestamp } from "firebase-admin/firestore";
import { hasActivePremium, isHackathonGuest } from "./premiumAccess";
import { RANGER_FREE_DAILY, RANGER_PREMIUM_DAILY } from "./premiumLimits";

export interface RangerUsageDoc {
    date?: string;
    count?: number;
}

function todayUtcDateKey(): string {
    return new Date().toISOString().slice(0, 10);
}

export function getRangerDailyLimit(userData: Record<string, unknown> | null | undefined): number {
    if (isHackathonGuest(userData ?? undefined)) return RANGER_PREMIUM_DAILY;
    if (hasActivePremium(userData ?? undefined)) return RANGER_PREMIUM_DAILY;
    return RANGER_FREE_DAILY;
}

export function computeRangerQuota(userData: Record<string, unknown> | null | undefined): {
    allowed: boolean;
    limit: number;
    used: number;
    remaining: number;
    date: string;
} {
    const date = todayUtcDateKey();
    const limit = getRangerDailyLimit(userData);
    const usage = userData?.rangerUsage as RangerUsageDoc | undefined;
    const used = usage?.date === date ? Math.max(0, Math.floor(usage.count ?? 0)) : 0;
    const remaining = Math.max(0, limit - used);

    return {
        allowed: remaining > 0,
        limit,
        used,
        remaining,
        date,
    };
}

export async function assertAndConsumeRangerQuota(
    db: Firestore,
    userId: string
): Promise<{ allowed: true } | { allowed: false; error: "RANGER_QUOTA_EXCEEDED"; limit: number }> {
    const userRef = db.collection("users").doc(userId);

    return db.runTransaction(async (tx) => {
        const snap = await tx.get(userRef);
        const data = snap.data() ?? {};
        const quota = computeRangerQuota(data);

        if (!quota.allowed) {
            return { allowed: false as const, error: "RANGER_QUOTA_EXCEEDED" as const, limit: quota.limit };
        }

        tx.set(
            userRef,
            {
                rangerUsage: {
                    date: quota.date,
                    count: quota.used + 1,
                    lastUpdated: Timestamp.now(),
                },
            },
            { merge: true }
        );

        return { allowed: true as const };
    });
}
