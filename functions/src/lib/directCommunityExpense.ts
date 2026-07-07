import type { Firestore } from "firebase-admin/firestore";
import { computeDirectCommunityFromRefugioPricing } from "./directCommunity";

export interface ValidatedDirectInjection {
    injectionCop: number;
    hostSharePercent: number;
    couponId: string;
    refugioId: string;
    departmentId: string;
    expenseAmountCop: number;
}

function parsePricingGuide(raw: unknown): unknown {
    if (!raw) return null;
    if (typeof raw === "object") return raw;
    if (typeof raw === "string") {
        try {
            return JSON.parse(raw);
        } catch {
            return null;
        }
    }
    return null;
}

function refugioHasCouponFlag(data: Record<string, unknown>): boolean {
    const coupon = data.coupon ?? data.coupons;
    return (
        coupon === true ||
        coupon === "true" ||
        coupon === "Sí" ||
        coupon === "si"
    );
}

function couponMatchesRefugioDestinations(
    couponDestId: string | undefined,
    refugioDestIds: string[]
): boolean {
    if (!couponDestId || refugioDestIds.length === 0) return false;
    return refugioDestIds.includes(couponDestId);
}

export function computeInjectionCop(amountCop: number, hostSharePercent: number): number {
    if (!Number.isFinite(amountCop) || amountCop <= 0) return 0;
    if (!Number.isFinite(hostSharePercent) || hostSharePercent <= 0 || hostSharePercent > 100) {
        return 0;
    }
    return Math.round((amountCop * hostSharePercent) / 100);
}

/**
 * Server-authoritative validation for P2-ESG-01.
 * Only counts expenses with validated hostSharePercent + active coupon + verified refugio.
 */
export async function validateDirectCommunityExpense(
    db: Firestore,
    params: {
        couponId: string;
        refugioId: string;
        hostSharePercent: number;
        expenseAmountCop: number;
    }
): Promise<ValidatedDirectInjection | null> {
    const { couponId, refugioId, hostSharePercent, expenseAmountCop } = params;
    if (!couponId || !refugioId) return null;
    if (!Number.isFinite(expenseAmountCop) || expenseAmountCop <= 0) return null;

    const [refugioSnap, couponSnap] = await Promise.all([
        db.collection("refugios").doc(refugioId).get(),
        db.collection("Coupons").doc(couponId).get(),
    ]);

    if (!refugioSnap.exists || !couponSnap.exists) return null;

    const refugio = refugioSnap.data() as Record<string, unknown>;
    const coupon = couponSnap.data() as Record<string, unknown>;

    if (String(refugio.status || "Activo") !== "Activo") return null;
    if (!refugioHasCouponFlag(refugio)) return null;

    const direct = computeDirectCommunityFromRefugioPricing(parsePricingGuide(refugio.pricingGuide));
    if (!direct) return null;
    if (direct.hostSharePercent !== hostSharePercent) return null;

    const destIds = Array.isArray(refugio.destinationId)
        ? (refugio.destinationId as string[])
        : refugio.destinationId
          ? [String(refugio.destinationId)]
          : [];

    const couponDestId = String(coupon.destinationId || "");
    if (!couponMatchesRefugioDestinations(couponDestId, destIds)) return null;

    const injectionCop = computeInjectionCop(expenseAmountCop, direct.hostSharePercent);
    if (injectionCop <= 0) return null;

    return {
        injectionCop,
        hostSharePercent: direct.hostSharePercent,
        couponId,
        refugioId,
        departmentId: String(refugio.departmentId || ""),
        expenseAmountCop,
    };
}

export function monthKeyFromDate(date: Date): string {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
}
