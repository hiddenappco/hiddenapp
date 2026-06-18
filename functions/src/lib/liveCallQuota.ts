import type { Firestore } from "firebase-admin/firestore";
import { Timestamp } from "firebase-admin/firestore";
import { hasActivePremium, isHackathonGuest } from "./premiumAccess";
import {
    LIVE_PERIOD_MS,
    LIVE_PREMIUM_MONTHLY_SECONDS,
    LIVE_TRIAL_SECONDS,
} from "./premiumLimits";

export interface LiveCallUsageDoc {
    periodStart?: Timestamp | { toDate?: () => Date };
    usedSeconds?: number;
}

export interface LiveCallQuotaResult {
    allowed: boolean;
    remainingSeconds: number;
    limitSeconds: number;
    periodEndsAt: Date;
    resetAt: string;
    isTrial: boolean;
    isBlocked: boolean;
    reason?: "PREMIUM_REQUIRED" | "LIVE_QUOTA_EXCEEDED";
}

function parsePeriodStart(raw: LiveCallUsageDoc["periodStart"]): Date {
    if (!raw) return new Date();
    if (typeof raw === "object" && raw !== null && "toDate" in raw && typeof raw.toDate === "function") {
        return raw.toDate();
    }
    return new Date();
}

export function computePremiumLiveQuota(usage?: LiveCallUsageDoc | null) {
    const now = Date.now();
    const limitSeconds = LIVE_PREMIUM_MONTHLY_SECONDS;
    let periodStart = parsePeriodStart(usage?.periodStart);
    let usedSeconds = Math.max(0, Math.floor(usage?.usedSeconds ?? 0));

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
    };
}

export function computeLiveCallQuotaForUser(
    userData: Record<string, unknown> | null | undefined
): LiveCallQuotaResult {
    const now = Date.now();

    if (isHackathonGuest(userData ?? undefined)) {
        const periodEndsAt = new Date(now + LIVE_PERIOD_MS);
        return {
            allowed: true,
            remainingSeconds: LIVE_PREMIUM_MONTHLY_SECONDS,
            limitSeconds: LIVE_PREMIUM_MONTHLY_SECONDS,
            periodEndsAt,
            resetAt: periodEndsAt.toISOString(),
            isTrial: false,
            isBlocked: false,
        };
    }

    if (hasActivePremium(userData ?? undefined)) {
        const usage = userData?.liveCallUsage as LiveCallUsageDoc | undefined;
        const quota = computePremiumLiveQuota(usage);
        return {
            allowed: !quota.isBlocked,
            remainingSeconds: quota.remainingSeconds,
            limitSeconds: quota.limitSeconds,
            periodEndsAt: quota.periodEndsAt,
            resetAt: quota.periodEndsAt.toISOString(),
            isTrial: false,
            isBlocked: quota.isBlocked,
            reason: quota.isBlocked ? "LIVE_QUOTA_EXCEEDED" : undefined,
        };
    }

    const trialUsed = Math.max(0, Math.floor(Number(userData?.liveTrialUsedSeconds ?? 0)));
    const remainingSeconds = Math.max(0, LIVE_TRIAL_SECONDS - trialUsed);

    return {
        allowed: remainingSeconds > 0,
        remainingSeconds,
        limitSeconds: LIVE_TRIAL_SECONDS,
        periodEndsAt: new Date(now + 365 * 24 * 60 * 60 * 1000),
        resetAt: "",
        isTrial: true,
        isBlocked: remainingSeconds <= 0,
        reason: remainingSeconds <= 0 ? "PREMIUM_REQUIRED" : undefined,
    };
}

export async function assertLiveCallQuota(db: Firestore, userId: string): Promise<LiveCallQuotaResult> {
    const snap = await db.collection("users").doc(userId).get();
    return computeLiveCallQuotaForUser(snap.data());
}

export async function addLiveCallSecondsAdmin(
    db: Firestore,
    userId: string,
    seconds: number
): Promise<void> {
    const delta = Math.max(0, Math.floor(seconds));
    if (delta === 0) return;

    const userRef = db.collection("users").doc(userId);

    await db.runTransaction(async (tx) => {
        const snap = await tx.get(userRef);
        const data = snap.data() ?? {};

        if (isHackathonGuest(data)) return;

        if (hasActivePremium(data)) {
            const usage = data.liveCallUsage as LiveCallUsageDoc | undefined;
            const quota = computePremiumLiveQuota(usage);
            const now = Date.now();

            let periodStart = quota.periodStart;
            let usedSeconds = quota.usedSeconds;

            if (now - periodStart.getTime() >= LIVE_PERIOD_MS) {
                periodStart = new Date(now);
                usedSeconds = 0;
            }

            usedSeconds += delta;

            tx.set(
                userRef,
                {
                    liveCallUsage: {
                        periodStart: Timestamp.fromDate(periodStart),
                        usedSeconds,
                        lastUpdated: Timestamp.now(),
                    },
                },
                { merge: true }
            );
            return;
        }

        const trialUsed = Math.max(0, Math.floor(Number(data.liveTrialUsedSeconds ?? 0)));
        tx.set(
            userRef,
            {
                liveTrialUsedSeconds: trialUsed + delta,
            },
            { merge: true }
        );
    });
}

// Re-export for backward compatibility
export const LIVE_CALL_MONTHLY_LIMIT_SECONDS = LIVE_PREMIUM_MONTHLY_SECONDS;
export const LIVE_CALL_PERIOD_MS = LIVE_PERIOD_MS;
