import type { ExpeditionTravel, ExpeditionTravelSegment } from '../hooks/useExpedition';

/** Resolve segments for UI — prefers server-built `travelSegments`, falls back to legacy `travel`. */
export function resolveStopTravelSegments(
    travel: ExpeditionTravel | null | undefined,
    travelSegments: ExpeditionTravelSegment[] | null | undefined
): ExpeditionTravelSegment[] {
    if (travelSegments && travelSegments.length > 0) return travelSegments;
    if (!travel || (!travel.durationText && !travel.distanceText)) return [];
    return [
        {
            kind: 'driving',
            mode: '',
            durationText: travel.durationText,
            distanceText: travel.distanceText || undefined,
            icon: 'directions_car',
            source: 'routes',
        },
    ];
}

/** Human-readable line: "25 min · caminata moderada (3 km)" */
export function formatTravelSegmentLine(segment: ExpeditionTravelSegment): string {
    const duration = segment.durationText.trim();
    const mode = segment.mode.trim();
    const distance = segment.distanceText?.trim();

    if (mode && duration) {
        const base = `${duration} · ${mode}`;
        return distance ? `${base} (${distance})` : base;
    }
    if (duration) return distance ? `${duration} · ${distance}` : duration;
    return mode;
}
