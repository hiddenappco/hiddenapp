import type { Coupon, Destination, PricingItem } from '../types/content';

/** COP list price for Trip Pass — aligned with `Premium.tsx` fallback. */
export const TRIP_PASS_COP = 17_900;

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
        const dest = destinations.find((d) => d.id === coupon.destinationId);
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

/**
 * Picks the premium coupon with the highest estimated savings that clears the pass price.
 */
export function pickPaywallRoiEstimate(
    coupons: Coupon[],
    destinations: Destination[],
    options?: { locationHint?: string; destinationId?: string }
): PaywallRoiEstimate | null {
    const premium = coupons.filter((c) => c.isPremium);
    if (premium.length === 0) return null;

    const passPriceCop = TRIP_PASS_COP;
    let best: PaywallRoiEstimate | null = null;
    let bestScore = -1;

    for (const coupon of premium) {
        const meta = estimateWithMeta(coupon, destinations);
        if (!meta || meta.savingsCop < passPriceCop) continue;

        const contextBoost =
            (coupon.featuredCoupon ? 2 : 0) +
            (options?.destinationId && coupon.destinationId === options.destinationId ? 3 : 0) +
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
            };
        }
    }

    return best;
}
