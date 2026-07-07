import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "../config/firebase";
import {
    monthKeyFromDate,
    validateDirectCommunityExpense,
    type ValidatedDirectInjection,
} from "../lib/directCommunityExpense";

const INJECTIONS = "esg_direct_injections";
const MONTHLY = "esg_monthly_totals";

function readDirectCommunity(data: FirebaseFirestore.DocumentData | undefined) {
    const dc = data?.directCommunity;
    if (!dc || typeof dc !== "object") return null;
    const couponId = String((dc as Record<string, unknown>).couponId || "");
    const refugioId = String((dc as Record<string, unknown>).refugioId || "");
    const hostSharePercent = Number((dc as Record<string, unknown>).hostSharePercent);
    if (!couponId || !refugioId || !Number.isFinite(hostSharePercent)) return null;
    return { couponId, refugioId, hostSharePercent };
}

function injectionDocId(tripId: string, expenseId: string): string {
    return `${tripId}_${expenseId}`;
}

async function resolveContributorUid(
    tripId: string,
    expense: FirebaseFirestore.DocumentData
): Promise<string> {
    const paidBy = expense.paidByMemberId;
    if (typeof paidBy === "string" && paidBy) return paidBy;
    const tripSnap = await db.collection("trips").doc(tripId).get();
    const trip = tripSnap.data();
    return String(trip?.ownerId || trip?.userId || "");
}

/**
 * Idempotently reconciles the recorded injection for one expense against the
 * `desired` validated state. Reads the stored injection doc inside the
 * transaction and derives deltas from it, so redelivered events (Firestore
 * triggers are at-least-once) never double-count the aggregates.
 */
async function reconcileInjection(params: {
    tripId: string;
    expenseId: string;
    desired: ValidatedDirectInjection | null;
    contributorUid: string;
    monthKey: string;
}): Promise<void> {
    const { tripId, expenseId, desired, contributorUid, monthKey } = params;
    const injectionRef = db.collection(INJECTIONS).doc(injectionDocId(tripId, expenseId));

    await db.runTransaction(async (tx) => {
        const snap = await tx.get(injectionRef);
        const existing = snap.exists ? snap.data() : null;

        const prevActive = existing?.status === "active";
        const prevAmount = prevActive ? Number(existing?.amountCop || 0) : 0;
        const prevMonth = prevActive ? String(existing?.monthKey || "") : null;
        const prevUid = prevActive ? String(existing?.contributorUid || "") : "";

        const nextActive = desired != null;
        const nextAmount = nextActive ? desired.injectionCop : 0;

        // Fully idempotent: no-op when the stored state already matches.
        if (!prevActive && !nextActive) return;
        if (
            prevActive &&
            nextActive &&
            prevAmount === nextAmount &&
            prevMonth === monthKey &&
            prevUid === contributorUid
        ) {
            return;
        }

        // 1) Reverse the previously counted contribution (if any).
        if (prevActive && prevMonth) {
            tx.set(
                db.collection(MONTHLY).doc(prevMonth),
                {
                    monthKey: prevMonth,
                    totalCop: FieldValue.increment(-prevAmount),
                    transactionCount: FieldValue.increment(-1),
                    updatedAt: FieldValue.serverTimestamp(),
                },
                { merge: true }
            );
            if (prevUid) {
                tx.set(
                    db.collection("users").doc(prevUid),
                    { directInjectionTotalCop: FieldValue.increment(-prevAmount) },
                    { merge: true }
                );
            }
        }

        // 2) Apply the new contribution, or void the doc when no longer eligible.
        if (nextActive) {
            tx.set(injectionRef, {
                amountCop: nextAmount,
                expenseAmountCop: desired.expenseAmountCop,
                hostSharePercent: desired.hostSharePercent,
                refugioId: desired.refugioId,
                couponId: desired.couponId,
                departmentId: desired.departmentId,
                tripId,
                expenseId,
                contributorUid,
                monthKey,
                status: "active",
                createdAt: existing?.createdAt ?? FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
            });
            tx.set(
                db.collection(MONTHLY).doc(monthKey),
                {
                    monthKey,
                    totalCop: FieldValue.increment(nextAmount),
                    transactionCount: FieldValue.increment(1),
                    updatedAt: FieldValue.serverTimestamp(),
                },
                { merge: true }
            );
            if (contributorUid) {
                tx.set(
                    db.collection("users").doc(contributorUid),
                    { directInjectionTotalCop: FieldValue.increment(nextAmount) },
                    { merge: true }
                );
            }
        } else if (existing) {
            tx.set(
                injectionRef,
                { status: "void", voidedAt: FieldValue.serverTimestamp() },
                { merge: true }
            );
        }
    });
}

/**
 * P2-ESG-01 — Persist reproducible direct economic injection metrics when a trip
 * expense is tagged as verified coupon redemption at a refugio with documented host share.
 */
export const onTripExpenseWritten = onDocumentWritten(
    "trips/{tripId}/expenses/{expenseId}",
    async (event) => {
        const tripId = event.params.tripId;
        const expenseId = event.params.expenseId;
        const after = event.data?.after?.data();

        const afterDc = readDirectCommunity(after);
        const afterAmount = Number(after?.amount || 0);
        const afterActive = Boolean(after && afterDc && afterAmount > 0);

        let desired: ValidatedDirectInjection | null = null;
        let contributorUid = "";
        let monthKey = monthKeyFromDate(new Date());

        if (afterActive && afterDc && after) {
            desired = await validateDirectCommunityExpense(db, {
                couponId: afterDc.couponId,
                refugioId: afterDc.refugioId,
                hostSharePercent: afterDc.hostSharePercent,
                expenseAmountCop: afterAmount,
            });
            if (desired) {
                contributorUid = await resolveContributorUid(tripId, after);
                const createdAt = (
                    after.createdAt as { toDate?: () => Date } | undefined
                )?.toDate?.();
                monthKey = monthKeyFromDate(createdAt ?? new Date());
            } else {
                console.warn(
                    `[onTripExpenseWritten] rejected directCommunity ${tripId}/${expenseId}`
                );
            }
        }

        await reconcileInjection({ tripId, expenseId, desired, contributorUid, monthKey });
    }
);
