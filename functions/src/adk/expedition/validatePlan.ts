import type { ExpeditionRequest, GroundMobility } from './types';

type Row = Record<string, unknown>;

export interface PlanDay {
    day: number;
    stopIds: string[];
    overnightRefugioId: string;
}

export interface ValidationIssue {
    code: string;
    message: string;
    day?: number;
    destinationId?: string;
}

export interface ValidationResult {
    ok: boolean;
    issues: ValidationIssue[];
    note: string;
}

function maxStopsForPace(pace: ExpeditionRequest['pace'], groundMobility?: GroundMobility): number {
    let cap: number;
    if (pace === 'relaxed') cap = 2;
    else if (pace === 'intense') cap = 4;
    else cap = 3;
    if (groundMobility === 'public_transport') return Math.max(1, cap - 1);
    return cap;
}

function resolveSuggestedMinDays(dest: Row): number | null {
    const min = Number(dest.suggestedDaysMin ?? dest.recommendedMinDays);
    return Number.isFinite(min) && min > 0 ? min : null;
}

export function validateExpeditionPlan(
    request: ExpeditionRequest,
    planDays: PlanDay[],
    destById: Map<string, Row>
): ValidationResult {
    const issues: ValidationIssue[] = [];
    const requestedDays = Math.max(1, Math.min(30, Number(request.days) || 1));
    const paceCap = request.maxStopsPerDay ?? maxStopsForPace(request.pace, request.groundMobility);

    if (planDays.length === 0) {
        return { ok: false, issues: [{ code: 'EMPTY_PLAN', message: 'No days in plan' }], note: '' };
    }

    const mustVisit = request.mustVisitDestinationIds ?? [];
    const visited = new Set<string>();
    for (const d of planDays) {
        for (const id of d.stopIds) visited.add(id);
    }
    for (const id of mustVisit) {
        if (!visited.has(id)) {
            issues.push({
                code: 'MUST_VISIT_MISSING',
                message: `Must-visit destination ${id} not in plan`,
                destinationId: id,
            });
        }
    }

    for (const d of planDays) {
        if (d.stopIds.length > paceCap) {
            issues.push({
                code: 'TOO_MANY_STOPS',
                message: `Day ${d.day} has ${d.stopIds.length} stops (max ${paceCap})`,
                day: d.day,
            });
        }

        const clusters = new Set<string>();
        for (const stopId of d.stopIds) {
            const dest = destById.get(stopId);
            if (!dest) continue;
            const cluster = String(dest.regionCluster || '').trim();
            if (cluster) clusters.add(cluster);
            const minDays = resolveSuggestedMinDays(dest);
            if (minDays != null && minDays > 1) {
                const count = d.stopIds.filter((id) => id === stopId).length;
                if (count < minDays && requestedDays >= minDays) {
                    issues.push({
                        code: 'MIN_DAYS',
                        message: `${dest.title || stopId} needs ~${minDays} day(s); assigned ${count}`,
                        day: d.day,
                        destinationId: stopId,
                    });
                }
            }
        }
        if (clusters.size > 2) {
            issues.push({
                code: 'CLUSTER_MIX',
                message: `Day ${d.day} mixes ${clusters.size} region clusters`,
                day: d.day,
            });
        }
    }

    const note =
        issues.length > 0
            ? issues
                  .slice(0, 3)
                  .map((i) => i.message)
                  .join(' · ')
            : '';

    return { ok: issues.length === 0, issues, note };
}
