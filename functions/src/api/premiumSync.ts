import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { db } from "../config/firebase";
import {
    getPremiumExpiryDate,
    hasValidFuturePremiumEnd,
    parsePremiumDuration,
} from "../lib/premiumDuration";
import { TRIP_PASS_DURATION_MS } from "../lib/premiumLimits";

type TimedPremiumPlan = "trip_pass" | "monthly" | "annual";

const PLAN_DURATION_MS: Record<TimedPremiumPlan, number> = {
    trip_pass: TRIP_PASS_DURATION_MS,
    monthly: 30 * 24 * 60 * 60 * 1000,
    annual: 365 * 24 * 60 * 60 * 1000,
};

function resolveTimedPlan(raw: unknown): TimedPremiumPlan | null {
    const plan = String(raw || "").toLowerCase();
    if (plan === "monthly" || plan === "annual" || plan === "trip_pass") return plan;
    return null;
}

function buildDurationForPlan(plan: TimedPremiumPlan, now = new Date()): Record<string, Timestamp> {
    const ms = PLAN_DURATION_MS[plan];
    const end = new Date(now.getTime() + ms);
    return {
        startDate: Timestamp.fromDate(now),
        endDate: Timestamp.fromDate(end),
    };
}

function durationPayloadEqual(a: unknown, b: Record<string, Timestamp>): boolean {
    const parsed = parsePremiumDuration(a);
    if (!parsed?.end) return false;
    return Math.abs(parsed.end.getTime() - b.endDate.toMillis()) < 1000;
}

/**
 * `premiumExpiresAt` (Rowy Duration):
 * - **Empty** → Premium sin caducidad.
 * - **Con endDate** → expira y desactiva `isPremium` al vencer.
 * - **Auto-relleno** solo si `premiumPlan` es `trip_pass` | `monthly` | `annual` (compra/admin explícito).
 * - **Guests** (`isGuest`) → no tocar hasta post-hackathon (jul 2026).
 */
export const onUserPremiumSync = onDocumentWritten("users/{uid}", async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();
    if (!after) return;

    if (after.isGuest === true) return;

    const uid = event.params.uid;
    const wasPremium = before?.isPremium === true;
    const isPremium = after.isPremium === true;
    const now = Date.now();
    const updates: Record<string, unknown> = {};

    const expiryEnd = getPremiumExpiryDate(after.premiumExpiresAt);

    if (isPremium && expiryEnd && expiryEnd.getTime() <= now) {
        updates.isPremium = false;
    } else if (isPremium && !wasPremium) {
        const timedPlan = resolveTimedPlan(after.premiumPlan);
        if (timedPlan && !hasValidFuturePremiumEnd(after.premiumExpiresAt, now)) {
            const duration = buildDurationForPlan(timedPlan);
            if (!durationPayloadEqual(after.premiumExpiresAt, duration)) {
                updates.premiumExpiresAt = duration;
            }
        }
    }

    if (Object.keys(updates).length === 0) return;

    await db.collection("users").doc(uid).update({
        ...updates,
        premiumSyncedAt: FieldValue.serverTimestamp(),
    });
});

/** Hourly sweep — only users with a finite `premiumExpiresAt.end`. */
export const scheduledPremiumExpiry = onSchedule("every 60 minutes", async () => {
    const snap = await db.collection("users").where("isPremium", "==", true).get();
    const batch = db.batch();
    let count = 0;

    for (const docSnap of snap.docs) {
        const data = docSnap.data();
        if (data.isGuest === true) continue;

        const end = getPremiumExpiryDate(data.premiumExpiresAt);
        if (end && end.getTime() <= Date.now()) {
            batch.update(docSnap.ref, {
                isPremium: false,
                premiumSyncedAt: FieldValue.serverTimestamp(),
            });
            count += 1;
        }
    }

    if (count > 0) {
        await batch.commit();
        console.log(`[scheduledPremiumExpiry] Deactivated ${count} expired premium users`);
    }
});
