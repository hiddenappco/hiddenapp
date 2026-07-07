import { PREMIUM_PRICE_COP } from '../config/premiumPricing';
import type { Coupon, Destination, PricingItem } from '../types/content';

export const TRIP_PASS_USD = 4.99;
export const TRIP_PASS_COP = PREMIUM_PRICE_COP.trip;
export const MONTHLY_PASS_COP = PREMIUM_PRICE_COP.monthly;

const LAST_DESTINATION_ID_KEY = 'hidden_last_destination_id';
const LAST_DEPARTMENT_ID_KEY = 'hidden_last_department_id';

/** Conservative anchor when no `pricingGuide` is linked to the coupon. */
const DEFAULT_ANCHOR_COP = 120_000;

export type SavingsConfidence = 'exact' | 'from' | 'example';

export interface PaywallRoiEstimate {
    couponId: string;
    couponTitle: string;
    savingsCop: number;
    confidence: SavingsConfidence;
    passPriceCop: number;
    /** savingsCop - passPriceCop (positive = net gain after pass cost) */
    netCop: number;
    /** When the estimate was scoped to a department (premium page). */
    departmentId?: string;
    departmentName?: string;
}

export interface PaywallRoiPickOptions {
    locationHint?: string;
    destinationId?: string;
    departmentId?: string;
    /** When true, only coupons tied to destinations in `departmentId`. */
    departmentOnly?: boolean;
}

export interface LastVisitedDestinationContext {
    destinationId?: string;
    departmentId?: string;
}

function findDestination(destinations: Destination[], id?: string): Destination | undefined {
    if (!id) return undefined;
    return destinations.find((d) => d.id === id || d.customId === id);
}

function parseDiscountPercent(discount: string): number | null {
    const match = discount.match(/(\d{1,3})\s*%/);
    if (!match) return null;
    const pct = Number.parseInt(match[1], 10);
    return Number.isFinite(pct) && pct > 0 && pct <= 100 ? pct : null;
}

function parseFixedCopFromDiscount(discount: string): number | null {
    const digits = discount.replace(/[^\d]/g, '');
    if (digits.length < 4) return null;
    const value = Number.parseInt(digits, 10);
    return Number.isFinite(value) && value >= 5_000 ? value : null;
}

function lodgingAnchorFromGuide(guide: PricingItem[] | undefined): number | null {
    if (!Array.isArray(guide) || guide.length === 0) return null;

    const scoreItem = (item: PricingItem) => {
        const label = `${item.categoria || ''} ${item.item || ''}`.toLowerCase();
        let score = 0;
        if (/hosped|aloj|hotel|glamp|hostal|cabañ|refugio/.test(label)) score += 3;
        if (/comida|restaur|gastron|menú/.test(label)) score += 2;
        if (/tour|experien|aventur/.test(label)) score += 1;
        return { score, max: item.precio_max || 0 };
    };

    const ranked = guide
        .map(scoreItem)
        .filter((x) => x.max > 0)
        .sort((a, b) => b.score - a.score || b.max - a.max);

    return ranked[0]?.max ?? null;
}

function anchorCopForCoupon(coupon: Coupon, destinations: Destination[]): { anchor: number; confidence: SavingsConfidence } {
    if (coupon.destinationId) {
        const dest = findDestination(destinations, coupon.destinationId);
        const fromGuide = lodgingAnchorFromGuide(dest?.pricingGuide);
        if (fromGuide) return { anchor: fromGuide, confidence: 'from' };
    }

    if (coupon.category === 'lodging') {
        return { anchor: DEFAULT_ANCHOR_COP, confidence: 'example' };
    }

    return { anchor: 80_000, confidence: 'example' };
}

export function estimateCouponSavingsCop(coupon: Coupon, destinations: Destination[]): number | null {
    const fixed = parseFixedCopFromDiscount(coupon.discount);
    if (fixed) return fixed;

    const pct = parseDiscountPercent(coupon.discount);
    if (!pct) return null;

    const { anchor } = anchorCopForCoupon(coupon, destinations);
    return Math.round((anchor * pct) / 100);
}

function estimateWithMeta(
    coupon: Coupon,
    destinations: Destination[]
): { savingsCop: number; confidence: SavingsConfidence } | null {
    const fixed = parseFixedCopFromDiscount(coupon.discount);
    if (fixed) return { savingsCop: fixed, confidence: 'exact' };

    const pct = parseDiscountPercent(coupon.discount);
    if (!pct) return null;

    const { anchor, confidence } = anchorCopForCoupon(coupon, destinations);
    return { savingsCop: Math.round((anchor * pct) / 100), confidence };
}

function locationMatchesCoupon(coupon: Coupon, locationHint?: string): boolean {
    if (!locationHint?.trim()) return false;
    const hint = locationHint.toLowerCase();
    return (
        coupon.location?.toLowerCase().includes(hint) ||
        hint.includes(coupon.location?.toLowerCase() || '') ||
        coupon.title.toLowerCase().includes(hint)
    );
}

function couponMatchesDepartment(
    coupon: Coupon,
    destinations: Destination[],
    departmentId?: string
): boolean {
    if (!departmentId) return true;
    if (!coupon.destinationId) return false;
    const dest = findDestination(destinations, coupon.destinationId);
    return dest?.departmentId === departmentId;
}

/**
 * Picks the premium coupon with the highest estimated savings that clears the pass price.
 */
export function pickPaywallRoiEstimate(
    coupons: Coupon[],
    destinations: Destination[],
    options?: PaywallRoiPickOptions
): PaywallRoiEstimate | null {
    const premium = coupons.filter((c) => c.isPremium);
    if (premium.length === 0) return null;

    const passPriceCop = TRIP_PASS_COP;
    let best: PaywallRoiEstimate | null = null;
    let bestScore = -1;

    for (const coupon of premium) {
        if (options?.departmentOnly && options.departmentId) {
            if (!couponMatchesDepartment(coupon, destinations, options.departmentId)) continue;
        }

        const meta = estimateWithMeta(coupon, destinations);
        if (!meta || meta.savingsCop < passPriceCop) continue;

        const dest = findDestination(destinations, coupon.destinationId);
        const contextBoost =
            (coupon.featuredCoupon ? 2 : 0) +
            (options?.destinationId && coupon.destinationId === options.destinationId ? 3 : 0) +
            (options?.destinationId &&
            dest &&
            (dest.id === options.destinationId || dest.customId === options.destinationId)
                ? 3
                : 0) +
            (options?.departmentId && dest?.departmentId === options.departmentId ? 2 : 0) +
            (locationMatchesCoupon(coupon, options?.locationHint) ? 2 : 0);

        const score = meta.savingsCop + contextBoost * 1_000;

        if (score > bestScore) {
            bestScore = score;
            best = {
                couponId: coupon.id,
                couponTitle: coupon.title,
                savingsCop: meta.savingsCop,
                confidence: meta.confidence,
                passPriceCop,
                netCop: meta.savingsCop - passPriceCop,
                departmentId: options?.departmentId,
            };
        }
    }

    return best;
}

export function recordLastVisitedDestination(destination: {
    id: string;
    departmentId: string;
}): void {
    try {
        localStorage.setItem(LAST_DESTINATION_ID_KEY, destination.id);
        localStorage.setItem(LAST_DEPARTMENT_ID_KEY, destination.departmentId);
    } catch {
        /* private mode / quota */
    }
}

export function readLastVisitedDestinationContext(): LastVisitedDestinationContext {
    try {
        return {
            destinationId: localStorage.getItem(LAST_DESTINATION_ID_KEY) || undefined,
            departmentId: localStorage.getItem(LAST_DEPARTMENT_ID_KEY) || undefined,
        };
    } catch {
        return {};
    }
}
