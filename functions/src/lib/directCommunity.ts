export interface DirectCommunityAmount {
    minCop: number;
    maxCop: number;
    hostSharePercent: number;
}

interface DirectCommunityInput {
    precio_min?: number;
    precio_max?: number;
    precio?: number;
    valor_noche?: number;
    hostSharePercent?: number;
    porcentaje_anfitrion?: number;
    directToHost?: boolean;
    categoria?: string;
}

const LODGING_KEYWORDS = ['alojamiento', 'lodging', 'accommodation', 'hospedaje', 'cabaña', 'refugio'];

function isLodgingCategory(label: string | undefined): boolean {
    const c = (label || '').toLowerCase();
    return LODGING_KEYWORDS.some((k) => c.includes(k));
}

function readSharePercent(item: DirectCommunityInput): number | null {
    if (item.directToHost === true) return 100;
    const pct = item.hostSharePercent ?? item.porcentaje_anfitrion;
    if (typeof pct === 'number' && pct > 0 && pct <= 100) return pct;
    return null;
}

function readPriceRange(item: DirectCommunityInput): { min: number; max: number } | null {
    const min = item.precio_min ?? item.precio ?? item.valor_noche;
    const max = item.precio_max ?? item.precio ?? item.valor_noche;
    if (min == null && max == null) return null;
    const lo = Number(min ?? max);
    const hi = Number(max ?? min);
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) return null;
    return { min: Math.min(lo, hi), max: Math.max(lo, hi) };
}

export function computeDirectCommunityAmount(
    items: DirectCommunityInput[] | null | undefined,
    options?: { lodgingOnly?: boolean }
): DirectCommunityAmount | null {
    if (!items?.length) return null;

    const candidates = items.filter((item) => {
        const share = readSharePercent(item);
        if (!share) return false;
        if (options?.lodgingOnly && item.categoria) {
            return isLodgingCategory(item.categoria);
        }
        return true;
    });

    if (candidates.length === 0) return null;

    let minCop = Number.POSITIVE_INFINITY;
    let maxCop = 0;
    let share = 0;

    for (const item of candidates) {
        const range = readPriceRange(item);
        const pct = readSharePercent(item);
        if (!range || !pct) continue;
        share = Math.max(share, pct);
        minCop = Math.min(minCop, (range.min * pct) / 100);
        maxCop = Math.max(maxCop, (range.max * pct) / 100);
    }

    if (!Number.isFinite(minCop) || maxCop <= 0) return null;
    return {
        minCop: Math.round(minCop),
        maxCop: Math.round(maxCop),
        hostSharePercent: share,
    };
}

export function computeDirectCommunityFromRefugioPricing(pricingData: unknown): DirectCommunityAmount | null {
    if (!pricingData || typeof pricingData !== 'object') return null;
    const data = pricingData as Record<string, unknown>;
    const globalShare =
        typeof data.porcentaje_anfitrion === 'number'
            ? data.porcentaje_anfitrion
            : typeof data.hostSharePercent === 'number'
              ? data.hostSharePercent
              : null;

    const rows: DirectCommunityInput[] = [];

    if (Array.isArray(data.desglose_tarifas)) {
        for (const row of data.desglose_tarifas as Record<string, unknown>[]) {
            rows.push({
                valor_noche: Number(row.valor_noche),
                hostSharePercent: (row.porcentaje_anfitrion as number) ?? globalShare ?? undefined,
                directToHost: row.directToHost === true,
            });
        }
    }

    if (globalShare && (data.precio_minimo != null || data.precio_maximo != null)) {
        rows.push({
            precio_min: Number(data.precio_minimo),
            precio_max: Number(data.precio_maximo),
            hostSharePercent: globalShare,
        });
    }

    return computeDirectCommunityAmount(rows);
}

export function computeDirectCommunityFromPricingGuide(pricingGuide: unknown): DirectCommunityAmount | null {
    if (!Array.isArray(pricingGuide)) return null;
    const lodgingItems = pricingGuide.filter((item) =>
        isLodgingCategory((item as { categoria?: string }).categoria)
    ) as DirectCommunityInput[];
    return computeDirectCommunityAmount(lodgingItems);
}

/** Attach computed field for MCP / agent knowledge (null = omit anti-greenwashing). */
export function enrichDirectCommunityFields(
    row: Record<string, unknown>,
    kind: 'destination' | 'refugio'
): Record<string, unknown> {
    const amount =
        kind === 'destination'
            ? computeDirectCommunityFromPricingGuide(row.pricingGuide ?? row.pricing_guide)
            : computeDirectCommunityFromRefugioPricing(row.pricingGuide ?? row.pricing_guide);

    if (!amount) return row;
    return {
        ...row,
        directCommunityAmount: amount,
    };
}
