type Row = Record<string, unknown>;

/** Matches curator/logistics prompts: same-day viable when shared cluster or under ~40 km. */
export const EXPEDITION_SAME_DAY_KM = 40;

/** Post-plan rule in validatePlan.ts — at most two region clusters per day. */
export const EXPEDITION_MAX_CLUSTERS_PER_DAY = 2;

export type MustVisitFeasibilityCode = 'CLUSTER_SPREAD' | 'MIN_DAYS' | 'DISTANT_CLUSTERS';

export interface MustVisitFeasibilityIssue {
    code: MustVisitFeasibilityCode;
    currentDays: number;
    suggestedDays: number;
    clusterLabels: string[];
    destinationTitles: string[];
}

export interface MustVisitFeasibilityResult {
    ok: boolean;
    suggestedDays: number;
    issues: MustVisitFeasibilityIssue[];
}

function resolveDestinationMinDays(dest: Row): number {
    const raw = dest.suggestedDaysMin ?? dest.recommendedMinDays;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

function resolveDestinationCluster(dest: Row): string {
    return String(dest.regionCluster || '').trim();
}

function coordsOf(dest: Row): { lat: number; lng: number } | null {
    // Accept {lat,lng}, {latitude,longitude} and Firestore GeoPoint (getters
    // latitude/longitude) — createExpedition passes raw docs (GeoPoint), while
    // the pipeline passes rows already normalized to {lat,lng}.
    const c = dest.coordinates as Record<string, unknown> | null | undefined;
    if (!c || typeof c !== 'object') return null;
    const lat = (c.lat ?? c.latitude) as unknown;
    const lng = (c.lng ?? c.longitude) as unknown;
    if (
        typeof lat === 'number' &&
        typeof lng === 'number' &&
        !Number.isNaN(lat) &&
        !Number.isNaN(lng)
    ) {
        return { lat, lng };
    }
    return null;
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
    const R = 6371;
    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLng = ((b.lng - a.lng) * Math.PI) / 180;
    const s =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return Math.round(2 * R * Math.asin(Math.sqrt(s)));
}

function maxCrossClusterDistanceKm(dests: Row[]): number {
    let max = 0;
    for (let i = 0; i < dests.length; i++) {
        const clusterI = resolveDestinationCluster(dests[i]);
        const coordI = coordsOf(dests[i]);
        if (!coordI || !clusterI) continue;
        for (let j = i + 1; j < dests.length; j++) {
            const clusterJ = resolveDestinationCluster(dests[j]);
            if (!clusterJ || clusterI === clusterJ) continue;
            const coordJ = coordsOf(dests[j]);
            if (!coordJ) continue;
            max = Math.max(max, haversineKm(coordI, coordJ));
        }
    }
    return max;
}

/**
 * Deterministic pre-LLM feasibility for must-visit picks.
 * Keep in sync with client utils/expeditionFeasibility.ts.
 */
export function assessMustVisitFeasibility(
    requestedDays: number,
    mustVisitIds: string[],
    destinations: Row[]
): MustVisitFeasibilityResult {
    const days = Math.max(1, Math.min(30, Math.floor(Number(requestedDays) || 1)));
    const ids = [...new Set(mustVisitIds.map(String).filter(Boolean))];

    if (ids.length === 0) {
        return { ok: true, suggestedDays: days, issues: [] };
    }

    const byId = new Map(destinations.map((d) => [String(d.id), d]));
    const selected = ids.map((id) => byId.get(id)).filter(Boolean) as Row[];
    const titles = selected.map((d) => String(d.title || d.name || d.id || ''));

    const clusterLabels = [...new Set(selected.map(resolveDestinationCluster).filter(Boolean))];
    const clusterCount = clusterLabels.length;

    const clusterPackingDays =
        clusterCount > 0 ? Math.ceil(clusterCount / EXPEDITION_MAX_CLUSTERS_PER_DAY) : 1;

    const catalogMinDays = selected.length > 0 ? Math.max(...selected.map(resolveDestinationMinDays)) : 1;

    let spreadDays = 1;
    if (clusterCount >= 2 && maxCrossClusterDistanceKm(selected) > EXPEDITION_SAME_DAY_KM) {
        spreadDays = clusterCount;
    }

    const requiredDays = Math.max(clusterPackingDays, catalogMinDays, spreadDays);
    const suggestedDays = Math.min(30, Math.max(requiredDays, days));

    if (days >= requiredDays) {
        return { ok: true, suggestedDays: days, issues: [] };
    }

    const issues: MustVisitFeasibilityIssue[] = [];

    if (clusterPackingDays > days) {
        issues.push({
            code: 'CLUSTER_SPREAD',
            currentDays: days,
            suggestedDays: Math.max(clusterPackingDays, requiredDays),
            clusterLabels,
            destinationTitles: titles,
        });
    }

    if (catalogMinDays > days) {
        issues.push({
            code: 'MIN_DAYS',
            currentDays: days,
            suggestedDays: Math.max(catalogMinDays, requiredDays),
            clusterLabels,
            destinationTitles: titles,
        });
    }

    if (spreadDays > days && clusterCount >= 2) {
        issues.push({
            code: 'DISTANT_CLUSTERS',
            currentDays: days,
            suggestedDays: Math.max(spreadDays, requiredDays),
            clusterLabels,
            destinationTitles: titles,
        });
    }

    if (issues.length === 0) {
        issues.push({
            code: 'DISTANT_CLUSTERS',
            currentDays: days,
            suggestedDays: requiredDays,
            clusterLabels,
            destinationTitles: titles,
        });
    }

    return { ok: false, suggestedDays, issues };
}

export function buildFeasibilityNote(
    result: MustVisitFeasibilityResult,
    language: 'es' | 'en'
): string {
    if (result.ok) return '';
    const clusters = result.issues[0]?.clusterLabels?.join(', ') || '';
    const days = result.suggestedDays;
    if (language === 'en') {
        if (clusters) {
            return `Must-visit destinations span distant zones (${clusters}). We recommend at least ${days} days.`;
        }
        return `These must-visit destinations are too spread out for the requested duration. Try at least ${days} days.`;
    }
    if (clusters) {
        return `Los imprescindibles abarcan zonas distantes (${clusters}). Recomendamos al menos ${days} días.`;
    }
    return `Estos destinos están muy dispersos para los días solicitados. Prueba con al menos ${days} días.`;
}
