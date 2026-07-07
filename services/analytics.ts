import { logEvent } from 'firebase/analytics';
import { analytics } from './firebase';

/** Best-effort Firebase Analytics — never throws. */
export function trackAnalyticsEvent(
    name: string,
    params?: Record<string, string | number | boolean>
): void {
    if (!analytics) return;
    try {
        logEvent(analytics, name, params);
    } catch {
        /* analytics optional */
    }
}

/** P2-ESG-01 — direct economic injection at verified refugio (0% Hidden commission). */
export function trackDirectEconomicInjection(params: {
    amountCop: number;
    refugioId: string;
    couponId: string;
}): void {
    trackAnalyticsEvent('direct_economic_injection', {
        amountCop: Math.round(params.amountCop),
        refugioId: params.refugioId,
        couponId: params.couponId,
    });
}
