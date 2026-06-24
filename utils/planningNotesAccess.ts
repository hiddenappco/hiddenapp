/**
 * Parses the editorial `planningNotes` section **TIEMPOS DE ACCESO** / **ACCESS TIMES**.
 *
 * Rowy example (ES):
 * ```
 * TIEMPOS DE ACCESO
 * Conducción: 45 min · Caminata: 25 min
 * ```
 *
 * EN:
 * ```
 * ACCESS TIMES
 * Driving: 45 min · Walk: 25 min
 * ```
 */
export interface AccessTimes {
    driveMinutes?: number;
    walkMinutes?: number;
}

const SECTION_MARKERS = ['TIEMPOS DE ACCESO', 'ACCESS TIMES'] as const;

const NEXT_SECTION =
    /(?:^|\n)\s*(?:DURACI[ÓO]N|DURATION|ACCESO|ACCESS|HORARIOS|SCHEDULE|RESTRICCIONES|COMBINAR|COMBINE)\s*:?\s*/i;

function extractAccessSectionBody(notes: string): string {
    const normalized = notes.replace(/\r\n/g, '\n');
    for (const marker of SECTION_MARKERS) {
        const idx = normalized.search(new RegExp(`(?:^|\\n)\\s*${marker}\\s*:?\\s*\\n?`, 'i'));
        if (idx === -1) continue;
        const afterMarker = normalized.slice(idx).replace(new RegExp(`^[^\\n]*${marker}[^\\n]*\\n?`, 'i'), '');
        const nextIdx = afterMarker.search(NEXT_SECTION);
        const body = (nextIdx === -1 ? afterMarker : afterMarker.slice(0, nextIdx)).trim();
        if (body) return body;
    }
    return normalized.trim();
}

function readMinutes(text: string, kind: 'drive' | 'walk'): number | undefined {
    const drivePattern =
        /(?:conducci[oó]n|veh[ií]culo|carro|auto|moto|driving|vehicle|drive|by car)[^0-9]{0,48}(\d{1,4})\s*(?:min(?:utos?)?|minutes?|m)\b/i;
    const walkPattern =
        /(?:caminata|a pie|sendero|trek|hike|walking|on foot|walk|hiking)[^0-9]{0,48}(\d{1,4})\s*(?:min(?:utos?)?|minutes?|m)\b/i;

    const match = text.match(kind === 'drive' ? drivePattern : walkPattern);
    if (!match) return undefined;
    const n = Number(match[1]);
    return Number.isFinite(n) && n > 0 ? n : undefined;
}

/** Returns drive/walk minutes when documented in planningNotes; null if nothing parseable. */
export function parseAccessTimesFromPlanningNotes(planningNotes: string | undefined | null): AccessTimes | null {
    const raw = String(planningNotes || '').trim();
    if (!raw) return null;

    const sectionBody = extractAccessSectionBody(raw);
    const driveMinutes = readMinutes(sectionBody, 'drive') ?? readMinutes(raw, 'drive');
    const walkMinutes = readMinutes(sectionBody, 'walk') ?? readMinutes(raw, 'walk');

    if (driveMinutes == null && walkMinutes == null) return null;
    return { driveMinutes, walkMinutes };
}

export function hasAccessTimes(times: AccessTimes | null): times is AccessTimes {
    return Boolean(times && (times.driveMinutes != null || times.walkMinutes != null));
}
