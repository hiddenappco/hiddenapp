import type { AppLanguage } from '../adk/chat/briefing';
import {
    classifyAccessLegKind,
    expeditionSegmentIcon,
    formatAccessLegDurationPlain,
    parseAccessTimesFromPlanningNotes,
    type AccessLegKind,
    type PlanningNotesLang,
} from './planningNotesAccess';

export interface ExpeditionTravelSegment {
    kind: AccessLegKind;
    mode: string;
    durationText: string;
    distanceText?: string;
    icon: string;
    source: 'routes' | 'catalog';
}

type Row = Record<string, unknown>;

function routesDrivingLabel(lang: PlanningNotesLang): string {
    return lang === 'en' ? 'by vehicle' : 'en vehículo';
}

/**
 * P2-PLAN-01 — Build multi-modal travel segments for an expedition stop.
 * 1. Google Routes driving leg (inter-stop), when available.
 * 2. Catalog legs from planningNotes TIEMPOS DE ACCESO (catalog minutes only — never LLM).
 * Skips duplicate driving from catalog when a Routes leg is already present.
 */
export function buildStopTravelSegments(
    routesLeg: { durationText: string; distanceText: string } | null,
    destination: Row,
    language: AppLanguage
): ExpeditionTravelSegment[] {
    const lang: PlanningNotesLang = language === 'en' ? 'en' : 'es';
    const segments: ExpeditionTravelSegment[] = [];

    if (routesLeg && (routesLeg.durationText || routesLeg.distanceText)) {
        segments.push({
            kind: 'driving',
            mode: routesDrivingLabel(lang),
            durationText: routesLeg.durationText,
            distanceText: routesLeg.distanceText || undefined,
            icon: 'directions_car',
            source: 'routes',
        });
    }

    const planningNotes = String(destination.planningNotes || '');
    const accessTimes = parseAccessTimesFromPlanningNotes(planningNotes, lang);
    const hasRoutesDriving = segments.some((s) => s.kind === 'driving' && s.source === 'routes');

    if (accessTimes) {
        for (const leg of accessTimes.legs) {
            const kind = classifyAccessLegKind(leg.mode);
            if (hasRoutesDriving && kind === 'driving') continue;

            segments.push({
                kind,
                mode: leg.mode,
                durationText: formatAccessLegDurationPlain(leg, lang),
                icon: expeditionSegmentIcon(kind),
                source: 'catalog',
            });
        }
    }

    return segments;
}

/** Legacy single-line travel for backward-compatible clients. */
export function summarizeTravelLegacy(
    segments: ExpeditionTravelSegment[]
): { durationText: string; distanceText: string } | null {
    if (segments.length === 0) return null;

    const durationText = segments
        .map((s) => {
            const mode = s.mode.trim();
            const dur = s.durationText.trim();
            return mode ? `${dur} ${mode}` : dur;
        })
        .filter(Boolean)
        .join(' + ');

    const driving = segments.find((s) => s.source === 'routes' && s.distanceText);
    return {
        durationText,
        distanceText: driving?.distanceText || '',
    };
}
