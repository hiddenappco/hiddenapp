type Row = Record<string, unknown>;

export interface ExpeditionCouponRef {
    id: string;
    isPremium: boolean;
    title: string;
    discount: string;
    destinationId?: string;
}

export interface DayCouponAssignment {
    day: number;
    coupons: ExpeditionCouponRef[];
}

const MAX_COUPONS_PER_DAY = 3;

function normalizeDestLinks(raw: unknown): string[] {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.map((v) => String(v).trim()).filter(Boolean);
    return [String(raw).trim()].filter(Boolean);
}

function couponMatchesDestination(coupon: Row, destinationId: string): boolean {
    const links = normalizeDestLinks(coupon.destinationId);
    if (links.length === 0) return false;
    const destNorm = destinationId.toLowerCase();
    return links.some((link) => {
        const l = link.toLowerCase();
        return l === destNorm || l.includes(destNorm) || destNorm.includes(l);
    });
}

function toCouponRef(coupon: Row): ExpeditionCouponRef {
    return {
        id: String(coupon.id),
        isPremium: coupon.isPremium === true,
        title: String(coupon.title || ''),
        discount: String(coupon.discount || ''),
        destinationId: normalizeDestLinks(coupon.destinationId)[0],
    };
}

/**
 * Deterministically assigns catalog coupons to expedition days by matching
 * coupon.destinationId to stops visited that day.
 */
export function assignCouponsToPlan(
    planDays: Array<{ day: number; stopIds: string[] }>,
    coupons: Row[]
): DayCouponAssignment[] {
    const usedCouponIds = new Set<string>();
    const assignments: DayCouponAssignment[] = [];

    for (const planDay of planDays.sort((a, b) => a.day - b.day)) {
        const dayCoupons: ExpeditionCouponRef[] = [];

        for (const stopId of planDay.stopIds) {
            for (const coupon of coupons) {
                const id = String(coupon.id || '');
                if (!id || usedCouponIds.has(id)) continue;
                if (!couponMatchesDestination(coupon, stopId)) continue;
                dayCoupons.push(toCouponRef(coupon));
                usedCouponIds.add(id);
                if (dayCoupons.length >= MAX_COUPONS_PER_DAY) break;
            }
            if (dayCoupons.length >= MAX_COUPONS_PER_DAY) break;
        }

        if (dayCoupons.length > 0) {
            assignments.push({ day: planDay.day, coupons: dayCoupons });
        }
    }

    return assignments;
}

/** Department-wide coupons (no destination link) shown in summary strip. */
export function assignDepartmentCoupons(coupons: Row[], usedIds: Set<string>): ExpeditionCouponRef[] {
    return coupons
        .filter((c) => {
            const id = String(c.id || '');
            if (!id || usedIds.has(id)) return false;
            return normalizeDestLinks(c.destinationId).length === 0;
        })
        .slice(0, 4)
        .map(toCouponRef);
}

export function flattenCouponWidgets(assignments: DayCouponAssignment[]): Array<{
    type: 'coupon';
    id: string;
    day: number;
    isPremium: boolean;
}> {
    const widgets: Array<{ type: 'coupon'; id: string; day: number; isPremium: boolean }> = [];
    for (const a of assignments) {
        for (const c of a.coupons) {
            widgets.push({ type: 'coupon', id: c.id, day: a.day, isPremium: c.isPremium });
        }
    }
    return widgets;
}
