import type { Coupon, Refugio } from '../types/content';
import type { ExpenseDirectCommunity } from '../types/trips';
import {
    computeDirectCommunityFromRefugioPricing,
    type DirectCommunityAmount,
} from './directCommunity';

export function computeInjectionCop(amountCop: number, hostSharePercent: number): number {
    if (!Number.isFinite(amountCop) || amountCop <= 0) return 0;
    if (!Number.isFinite(hostSharePercent) || hostSharePercent <= 0 || hostSharePercent > 100) return 0;
    return Math.round((amountCop * hostSharePercent) / 100);
}

function parseRefugioPricing(pricingGuide: unknown): unknown {
    if (!pricingGuide) return null;
    if (typeof pricingGuide === 'object') return pricingGuide;
    if (typeof pricingGuide === 'string') {
        try {
            return JSON.parse(pricingGuide);
        } catch {
            return null;
        }
    }
    return null;
}

export function readRefugioDirectCommunity(refugio: Refugio): DirectCommunityAmount | null {
    return computeDirectCommunityFromRefugioPricing(parseRefugioPricing(refugio.pricingGuide));
}

export function isRefugioCouponEligible(refugio: Refugio): boolean {
    if (refugio.status !== 'Activo') return false;
    if (!refugio.coupon) return false;
    return readRefugioDirectCommunity(refugio) != null;
}

export function couponMatchesRefugio(coupon: Coupon, refugio: Refugio): boolean {
    if (!coupon.destinationId) return false;
    const destIds = refugio.destinationId ?? [];
    return destIds.some((id) => id === coupon.destinationId);
}

export function listCouponsForRefugio(coupons: Coupon[], refugio: Refugio): Coupon[] {
    if (!isRefugioCouponEligible(refugio)) return [];
    return coupons.filter((c) => couponMatchesRefugio(c, refugio));
}

export function listEligibleRefugios(refugios: Refugio[]): Refugio[] {
    return refugios.filter(isRefugioCouponEligible);
}

export interface BuildDirectCommunityInput {
    couponId: string;
    refugioId: string;
    amountCop: number;
    coupons: Coupon[];
    refugios: Refugio[];
}

/** Client-side validation before persisting expense (server re-validates). */
export function buildExpenseDirectCommunity(
    input: BuildDirectCommunityInput
): ExpenseDirectCommunity | null {
    const refugio = input.refugios.find((r) => r.id === input.refugioId);
    const coupon = input.coupons.find((c) => c.id === input.couponId);
    if (!refugio || !coupon) return null;

    const direct = readRefugioDirectCommunity(refugio);
    if (!direct) return null;
    if (!isRefugioCouponEligible(refugio)) return null;
    if (!couponMatchesRefugio(coupon, refugio)) return null;

    const injectionCop = computeInjectionCop(input.amountCop, direct.hostSharePercent);
    if (injectionCop <= 0) return null;

    return {
        couponId: coupon.id,
        refugioId: refugio.id,
        hostSharePercent: direct.hostSharePercent,
        injectionCop,
    };
}
