/**
 * Server copy — keep in sync with `utils/planningNotesAccess.ts` (P2-PLAN-01).
 * Parses TIEMPOS DE ACCESO / ACCESS TIMES from editorial planningNotes.
 */
export interface AccessLeg {
    mode: string;
    minutes: number;
    minutesMax?: number;
}

export interface AccessTimes {
    legs: AccessLeg[];
}

export type PlanningNotesLang = 'es' | 'en';

const SECTION_MARKERS_ES = 'TIEMPOS DE ACCESO';
const SECTION_MARKERS_EN = 'ACCESS TIMES';

const NEXT_SECTION =
    /(?:^|\n)\s*(?:DURACI[ÓO]N|DURATION|ACCESO|ACCESS|HORARIOS|SCHEDULE|RESTRICCIONES|COMBINAR|COMBINE)\s*:?\s*/i;

const CROSS_LANG_STOP = /(?:^|\n)\s*ACCESS TIMES\s*:?\s*/i;
const CROSS_LANG_STOP_EN = /(?:^|\n)\s*TIEMPOS DE ACCESO\s*:?\s*/i;

function extractAccessSectionBody(notes: string, lang: PlanningNotesLang = 'es'): string {
    const normalized = notes.replace(/\r\n/g, '\n');
    const marker = lang === 'en' ? SECTION_MARKERS_EN : SECTION_MARKERS_ES;
    const markerRe = new RegExp(`(?:^|\\n)\\s*${marker}\\s*:?\\s*`, 'i');
    const match = markerRe.exec(normalized);
    if (!match) {
        if (lang === 'en') return extractAccessSectionBody(notes, 'es');
        return '';
    }

    let body = normalized.slice(match.index + match[0].length);
    const crossStop = lang === 'en' ? CROSS_LANG_STOP_EN : CROSS_LANG_STOP;
    const crossIdx = body.search(crossStop);
    if (crossIdx !== -1) body = body.slice(0, crossIdx);
    const nextIdx = body.search(NEXT_SECTION);
    if (nextIdx !== -1) body = body.slice(0, nextIdx);
    return body.trim();
}

function parseNumeric(value: string): number {
    return parseFloat(value.replace(',', '.'));
}

function toMinutes(value: string, unit: string): number {
    const n = parseNumeric(value);
    if (!Number.isFinite(n) || n <= 0) return 0;
    const u = unit.toLowerCase();
    if (/^h(?:oras?)?$|^hours?$/.test(u) || u === 'h') return Math.round(n * 60);
    return Math.round(n);
}

function cleanMode(raw: string): string {
    return raw
        .replace(/^["'«»]+|["'«»]+$/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

const PROSE_LEG =
    /(\d+(?:[.,]\d+)?)(?:\s*a\s*(\d+(?:[.,]\d+)?))?\s*(horas?|hours?|h\b|min(?:utos?)?|minutes?)\s+(?:en|de|by)\s+["'«]?(.+?)["'»]?(?=\s+(?:hasta|desde|from|to)\b|\s*\+|\s*\.|\s*$)/gi;

const LABEL_LEG =
    /(?:^|[+·\n]\s*)([^:+·\n]{2,48}):\s*(\d+(?:[.,]\d+)?)(?:\s*a\s*(\d+(?:[.,]\d+)?))?\s*(horas?|hours?|h\b|min(?:utos?)?|minutes?)?/gi;

function pushLeg(legs: AccessLeg[], mode: string, value: string, valueMax: string | undefined, unit: string | undefined) {
    const cleaned = cleanMode(mode);
    if (!cleaned) return;
    const u = unit?.trim() || 'min';
    const minutes = toMinutes(value, u);
    if (minutes <= 0) return;
    const leg: AccessLeg = { mode: cleaned, minutes };
    if (valueMax) {
        const max = toMinutes(valueMax, u);
        if (max > minutes) leg.minutesMax = max;
    }
    legs.push(leg);
}

function parseLegsFromBody(body: string): AccessLeg[] {
    const legs: AccessLeg[] = [];
    const chunks = body.split(/\s*\+\s*/);

    for (const chunk of chunks) {
        const text = chunk.trim();
        if (!text) continue;

        let matched = false;
        PROSE_LEG.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = PROSE_LEG.exec(text)) !== null) {
            matched = true;
            pushLeg(legs, m[4], m[1], m[2], m[3]);
        }
        if (matched) continue;

        LABEL_LEG.lastIndex = 0;
        while ((m = LABEL_LEG.exec(text)) !== null) {
            matched = true;
            pushLeg(legs, m[1], m[2], m[3], m[4]);
        }
    }

    return legs;
}

export function parseAccessTimesFromPlanningNotes(
    planningNotes: string | undefined | null,
    lang: PlanningNotesLang = 'es'
): AccessTimes | null {
    const raw = String(planningNotes || '').trim();
    if (!raw) return null;

    const sectionBody = extractAccessSectionBody(raw, lang);
    const legs = parseLegsFromBody(sectionBody || raw);

    if (legs.length === 0) return null;
    return { legs };
}

export type AccessLegKind = 'driving' | 'walking' | 'transit' | 'boat' | 'horse' | 'other';

export function classifyAccessLegKind(mode: string): AccessLegKind {
    const m = mode.toLowerCase();
    if (/\b(auto|carro|veh[ií]culo|camioneta|car|driving|drive|4x4)\b/.test(m)) return 'driving';
    if (/\b(caminata|sendero|trek|hike|walk|pie|hiking)\b/.test(m)) return 'walking';
    if (/\b(brujita|bus|colectivo|chiva|transporte)\b/.test(m)) return 'transit';
    if (/\b(lancha|panga|barco|boat|embarcaci)/.test(m)) return 'boat';
    if (/\b(caballo|horse|mula)\b/.test(m)) return 'horse';
    return 'other';
}

export function expeditionSegmentIcon(kind: AccessLegKind): string {
    switch (kind) {
        case 'driving':
            return 'directions_car';
        case 'walking':
            return 'hiking';
        case 'transit':
            return 'directions_bus';
        case 'boat':
            return 'directions_boat';
        case 'horse':
            return 'agriculture';
        default:
            return 'route';
    }
}

export function formatAccessLegDurationPlain(leg: AccessLeg, _lang: PlanningNotesLang = 'es'): string {
    const fmtHours = (mins: number) => {
        const h = mins / 60;
        return h % 1 === 0 ? String(h) : h.toFixed(1).replace(/\.0$/, '');
    };

    const isHourScale = leg.minutes >= 60 && leg.minutes % 30 === 0;
    if (leg.minutesMax != null) {
        if (isHourScale && leg.minutesMax >= 60) {
            return `${fmtHours(leg.minutes)}–${fmtHours(leg.minutesMax)} h`;
        }
        return `${leg.minutes}–${leg.minutesMax} min`;
    }
    if (isHourScale && leg.minutes % 60 !== 0) {
        return `${fmtHours(leg.minutes)} h`;
    }
    if (leg.minutes >= 90 && leg.minutes % 30 === 0) {
        return `${fmtHours(leg.minutes)} h`;
    }
    return `${leg.minutes} min`;
}
