/**
 * Parses the editorial `planningNotes` section **TIEMPOS DE ACCESO** / **ACCESS TIMES**.
 *
 * Each leg is an open `{ mode, duration }` pair — auto, brujita, lancha, caballo,
 * motocarro, caminata, etc. Agents and the destination UI read the same structure.
 *
 * Rowy examples:
 * ```
 * TIEMPOS DE ACCESO: 2.5 horas en auto hasta Córdoba + 25 min en brujita hasta el poblado
 * ACCESS TIMES: 2.5 hours by car to Córdoba + 25 min by brujita to the village
 * ```
 *
 * Compact (still supported):
 * ```
 * TIEMPOS DE ACCESO
 * Auto: 45 min · Brujita: 25 min · Caminata: 20 min
 * ```
 */
export interface AccessLeg {
    /** Editorial label: auto, brujita, caminata, lancha, caballo, motocarro… */
    mode: string;
    minutes: number;
    /** When Rowy uses a range (e.g. 20 a 30 min). */
    minutesMax?: number;
}

export interface AccessTimes {
    legs: AccessLeg[];
}

const SECTION_MARKERS_ES = 'TIEMPOS DE ACCESO';
const SECTION_MARKERS_EN = 'ACCESS TIMES';

export type PlanningNotesLang = 'es' | 'en';

const NEXT_SECTION =
    /(?:^|\n)\s*(?:DURACI[ÓO]N|DURATION|ACCESO|ACCESS|HORARIOS|SCHEDULE|RESTRICCIONES|COMBINAR|COMBINE)\s*:?\s*/i;

/** Stops parsing ES body before the EN mirror block (and vice versa). */
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

/** Prose legs: `2.5 horas en auto` · `20 a 30 minutos en brujita` · `4 a 5 horas de caminata` */
const PROSE_LEG =
    /(\d+(?:[.,]\d+)?)(?:\s*a\s*(\d+(?:[.,]\d+)?))?\s*(horas?|hours?|h\b|min(?:utos?)?|minutes?)\s+(?:en|de|by)\s+["'«]?(.+?)["'»]?(?=\s+(?:hasta|desde|from|to)\b|\s*\+|\s*\.|\s*$)/gi;

/** Label legs: `Auto: 45 min` · `Brujita: 20 a 30 min` */
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

/** Returns access legs when documented in planningNotes; null if nothing parseable. */
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

export function hasAccessTimes(times: AccessTimes | null): times is AccessTimes {
    return Boolean(times?.legs?.length);
}

/** Material icon hint for a hyperlocal mode label. */
export function accessLegIcon(mode: string): string {
    const m = mode.toLowerCase();
    if (/\b(auto|carro|veh[ií]culo|camioneta|car|driving|drive)\b/.test(m)) return 'directions_car';
    if (/\b(caminata|sendero|trek|hike|walk|pie|hiking)\b/.test(m)) return 'hiking';
    if (/\b(brujita|bus|colectivo|chiva)\b/.test(m)) return 'directions_bus';
    if (/\b(lancha|panga|barco|boat|embarcaci)/.test(m)) return 'directions_boat';
    if (/\b(caballo|horse|mula)\b/.test(m)) return 'agriculture';
    if (/\b(moto|motocarro|motoneta|bicicleta|bike)\b/.test(m)) return 'two_wheeler';
    if (/\b(avioneta|vuelo|flight)\b/.test(m)) return 'flight';
    if (/\b(l[ií]nea|transporte local)\b/.test(m)) return 'local_taxi';
    return 'route';
}

export function formatAccessLegDuration(
    leg: AccessLeg,
    labels: {
        minutes: (min: number) => string;
        minutesRange: (min: number, max: number) => string;
        hours: (hours: string) => string;
        hoursRange: (minH: string, maxH: string) => string;
    }
): string {
    const fmtHours = (mins: number) => {
        const h = mins / 60;
        return h % 1 === 0 ? String(h) : h.toFixed(1).replace(/\.0$/, '');
    };

    const isHourScale = leg.minutes >= 60 && leg.minutes % 30 === 0;
    if (leg.minutesMax != null) {
        if (isHourScale && leg.minutesMax >= 60) {
            return labels.hoursRange(fmtHours(leg.minutes), fmtHours(leg.minutesMax));
        }
        return labels.minutesRange(leg.minutes, leg.minutesMax);
    }
    if (isHourScale && leg.minutes % 60 !== 0) {
        return labels.hours(fmtHours(leg.minutes));
    }
    if (leg.minutes >= 90 && leg.minutes % 30 === 0) {
        return labels.hours(fmtHours(leg.minutes));
    }
    return labels.minutes(leg.minutes);
}

export type AccessLegKind = 'driving' | 'walking' | 'transit' | 'boat' | 'horse' | 'other';

/** Classify an editorial access-mode label for expedition segment rendering. */
export function classifyAccessLegKind(mode: string): AccessLegKind {
    const m = mode.toLowerCase();
    if (/\b(auto|carro|veh[ií]culo|camioneta|car|driving|drive|4x4)\b/.test(m)) return 'driving';
    if (/\b(caminata|sendero|trek|hike|walk|pie|hiking)\b/.test(m)) return 'walking';
    if (/\b(brujita|bus|colectivo|chiva|transporte)\b/.test(m)) return 'transit';
    if (/\b(lancha|panga|barco|boat|embarcaci)/.test(m)) return 'boat';
    if (/\b(caballo|horse|mula)\b/.test(m)) return 'horse';
    return 'other';
}

/** Material icon for expedition travel segments (P2-PLAN-01). */
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

/** Format catalog leg duration without i18n hooks (server + PDF). */
export function formatAccessLegDurationPlain(leg: AccessLeg, _lang: PlanningNotesLang = 'es'): string {
    const fmtHours = (mins: number) => {
        const h = mins / 60;
        return h % 1 === 0 ? String(h) : h.toFixed(1).replace(/\.0$/, '');
    };
    const fmtMin = (mins: number) => `${mins} min`;

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
    return fmtMin(leg.minutes);
}
