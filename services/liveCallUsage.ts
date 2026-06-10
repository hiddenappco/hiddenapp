import { doc, runTransaction, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import {
    computeLiveCallQuota,
    LIVE_CALL_PERIOD_MS,
    type LiveCallUsageRaw,
} from '../utils/liveCallQuota';

export async function addLiveCallSeconds(userId: string, seconds: number): Promise<void> {
    const delta = Math.max(0, Math.floor(seconds));
    if (!userId || delta === 0) return;

    const userRef = doc(db, 'users', userId);

    await runTransaction(db, async (tx) => {
        const snap = await tx.get(userRef);
        const raw = (snap.data()?.liveCallUsage ?? {}) as LiveCallUsageRaw;
        const quota = computeLiveCallQuota(raw);
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
