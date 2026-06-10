import type { Firestore } from "firebase-admin/firestore";
import { Timestamp } from "firebase-admin/firestore";

export const LIVE_CALL_MONTHLY_LIMIT_SECONDS = 30 * 60;
export const LIVE_CALL_PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

export interface LiveCallUsageDoc {
    periodStart?: Timestamp | { toDate?: () => Date };
    usedSeconds?: number;
}

export function computeLiveCallQuota(usage?: LiveCallUsageDoc | null) {
    const now = Date.now();
    const limitSeconds = LIVE_CALL_MONTHLY_LIMIT_SECONDS;
    let periodStart = usage?.periodStart?.toDate?.() ?? new Date(now);
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

export async function assertLiveCallQuota(db: Firestore, userId: string): Promise<{
    allowed: boolean;
    remainingSeconds: number;
    periodEndsAt: Date;
    resetAt: string;
}> {
    const snap = await db.collection("users").doc(userId).get();
    const userData = snap.data();

    if (userData?.isGuest === true) {
        const periodEndsAt = new Date(Date.now() + LIVE_CALL_PERIOD_MS);
        return {
            allowed: true,
            remainingSeconds: LIVE_CALL_MONTHLY_LIMIT_SECONDS,
            periodEndsAt,
            resetAt: periodEndsAt.toISOString(),
        };
    }

    const usage = userData?.liveCallUsage as LiveCallUsageDoc | undefined;
    const quota = computeLiveCallQuota(usage);

    return {
        allowed: !quota.isBlocked,
        remainingSeconds: quota.remainingSeconds,
        periodEndsAt: quota.periodEndsAt,
        resetAt: quota.periodEndsAt.toISOString(),
    };
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
        const usage = snap.data()?.liveCallUsage as LiveCallUsageDoc | undefined;
        const quota = computeLiveCallQuota(usage);
        const now = Date.now();

        let periodStart = quota.periodStart;
        let usedSeconds = quota.usedSeconds;

        if (now - periodStart.getTime() >= LIVE_CALL_PERIOD_MS) {
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
    });
}
