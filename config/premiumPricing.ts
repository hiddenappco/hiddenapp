/**
 * Reference USD prices for Premium UI (web / pre-store builds).
 * Keep aligned with `HIDDEN_APP_LEGAL_Y_FAQ.md` and `docs/PREMIUM_ENTITLEMENTS.md`.
 * Live checkout uses RevenueCat `priceString` when `PREMIUM_CHECKOUT_ENABLED`.
 */
export type PremiumPlanId = 'trip' | 'monthly' | 'annual' | 'lifetime';

/** Numeric USD list prices — single source for UI and ROI math. */
export const PREMIUM_PRICE_USD: Record<PremiumPlanId, number> = {
    trip: 4.99,
    monthly: 7.99,
    annual: 79.99,
    lifetime: 149.99,
};

export const PREMIUM_REFERENCE_PRICES: Record<PremiumPlanId, string> = {
    trip: '$4.99',
    monthly: '$7.99',
    annual: '$79.99',
    lifetime: '$149.99',
};

/** COP anchors for paywall ROI (catalog is in COP; ~3 600 COP/USD reference). */
export const PREMIUM_PRICE_COP = {
    trip: Math.round(PREMIUM_PRICE_USD.trip * 3_600),
    monthly: Math.round(PREMIUM_PRICE_USD.monthly * 3_600),
} as const;

/** Short labels shown under compare-matrix column headers. */
export const PREMIUM_COMPARE_HEADER_PRICES: Record<'trip' | 'vipFrom', string> = {
    trip: '$4.99',
    vipFrom: '$7.99',
};
