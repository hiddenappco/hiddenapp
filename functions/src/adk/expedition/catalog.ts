type Row = Record<string, unknown>;

const TEXT_CAP = 4000;
const PLANNING_NOTES_CAP = 4000;

export function stripPlannerText(value: unknown, maxLen = TEXT_CAP): string {
    const text = String(value ?? '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&[a-zA-Z#0-9]+;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    if (!text) return '';
    return text.length > maxLen ? `${text.slice(0, maxLen)}…` : text;
}

/** Mirrors Live agent semáforo — closed destinations never enter the planner. */
export function isDestinationOpen(row: Row): boolean {
    const status = row.status;
    if (status === 'Cerrado' || status === false || status === 'cerrado') return false;
    const op = String(row.operationalStatus ?? '').toLowerCase();
    if (op === 'red') return false;
    return status === 'Abierto' || status === true || status === 'abierto';
}

function summarizePricing(pricing: unknown): Row[] {
    if (!Array.isArray(pricing)) return [];
    return pricing.slice(0, 24).map((item) => {
        const p = item as Row;
        return {
            categoria: p.categoria ?? p.category ?? '',
            item: p.item ?? '',
            precio_min: p.precio_min ?? p.min ?? 0,
            precio_max: p.precio_max ?? p.max ?? 0,
            nota: stripPlannerText(p.nota ?? p.note ?? '', 120),
        };
    });
}

function compactGettingThere(rows: unknown): Row[] {
    if (!Array.isArray(rows)) return [];
    return rows.map((item) => {
        const g = item as Row;
        return {
            modalidad: String(g.modalidad ?? g.mode ?? ''),
            instrucciones: stripPlannerText(g.instrucciones ?? g.instructions ?? '', 800),
        };
    });
}

function compactPacking(row: Row): Row {
    const summary = stripPlannerText(row.packingSummary ?? '', 500);
    const guide = row.packingGuide;
    if (!guide) return { packingSummary: summary };
    if (typeof guide === 'string') {
        return { packingSummary: summary || stripPlannerText(guide, 500) };
    }
    if (Array.isArray(guide)) {
        return {
            packingSummary: summary,
            packingCategories: guide.slice(0, 8).map((cat) => {
                const c = cat as Row;
                return {
                    categoria: c.categoria ?? '',
                    items: Array.isArray(c.items)
                        ? (c.items as Row[]).slice(0, 12).map((i) => ({
                              nombre: i.nombre ?? '',
                              prioridad: i.prioridad ?? '',
                              nota: stripPlannerText(i.nota ?? '', 80),
                          }))
                        : [],
                };
            }),
        };
    }
    return { packingSummary: summary };
}

/** Full textual context for curator / logistics / writer — no hero images. */
export function buildPlannerDestination(row: Row): Row {
    const stats = (row.stats as Row | undefined) ?? {};
    return {
        id: row.id,
        title: row.title ?? row.name ?? '',
        location: row.location ?? '',
        coordinates: row.coordinates ?? null,
        status: row.status,
        operationalStatus: row.operationalStatus ?? '',
        verified: row.verified ?? false,
        description: stripPlannerText(row.description, TEXT_CAP),
        activities: Array.isArray(row.activities) ? row.activities : [],
        gettingThere: compactGettingThere(row.gettingThere),
        pricingGuide: summarizePricing(row.pricingGuide),
        ...compactPacking(row),
        stats: {
            hiking: stats.hiking ?? row.hiking ?? '',
            temp: stats.temp ?? '',
            signal: stats.signal ?? '',
        },
        isCoastal: row.isCoastal ?? '',
        aiTip: stripPlannerText(row.aiTip, 400),
        suggestedDaysMin: row.suggestedDaysMin ?? row.recommendedMinDays ?? null,
        suggestedDaysMax: row.suggestedDaysMax ?? null,
        regionCluster: row.regionCluster ?? '',
        planningNotes: stripPlannerText(row.planningNotes, PLANNING_NOTES_CAP),
        recommendedMinDays: row.recommendedMinDays ?? null,
        destinationType: row.destinationType ?? '',
        accessModes: Array.isArray(row.accessModes) ? row.accessModes : [],
    };
}

export function buildCuratorCatalog(destinations: Row[]): Row[] {
    return destinations.filter(isDestinationOpen).map(buildPlannerDestination);
}

export function buildRefugioPlannerRow(row: Row): Row {
    return {
        id: row.id,
        name: row.name ?? '',
        location: row.location ?? '',
        coordinates: row.coordinates ?? null,
        destinationId: row.destinationId ?? [],
        type: row.type ?? [],
        status: row.status,
        pricingGuide: summarizePricing(row.pricingGuide),
        howToBook: stripPlannerText(row.howToBook, 400),
        amenities: Array.isArray(row.amenities) ? row.amenities.slice(0, 20) : [],
        description: stripPlannerText(row.description, 600),
    };
}

export function buildRequestSummary(request: Row, language: string): string {
    const lang = language === 'en' ? 'en' : 'es';
    const days = Number(request.days) || 1;
    const origin = (request.origin as Row | undefined) ?? {};
    const originLabel =
        String(origin.label || request.originLabel || '') ||
        (typeof request.originLat === 'number' ? `${request.originLat}, ${request.originLng}` : lang === 'en' ? 'unknown' : 'desconocido');
    const interests = Array.isArray(request.interests) ? request.interests.join(', ') : lang === 'en' ? 'general' : 'general';
    const mustVisit = Array.isArray(request.mustVisitDestinationIds)
        ? request.mustVisitDestinationIds.join(', ')
        : lang === 'en' ? 'none' : 'ninguno';
    const budgetMode = request.budgetMode || 'open';
    const budget = (request.budget as Row | undefined) ?? {};
    const budgetLine =
        budgetMode === 'open'
            ? lang === 'en' ? 'open budget' : 'presupuesto abierto'
            : budgetMode === 'fixed'
              ? lang === 'en'
                  ? `fixed ~${budget.amountCOP ?? '?'} COP`
                  : `fijo ~${budget.amountCOP ?? '?'} COP`
              : lang === 'en'
                ? `range ${budget.minCOP ?? '?'}–${budget.maxCOP ?? '?'} COP`
                : `rango ${budget.minCOP ?? '?'}–${budget.maxCOP ?? '?'} COP`;

    const dates = request.travelDates as Row | undefined;
    const dateLine =
        dates?.start && dates?.end
            ? `${dates.start} → ${dates.end}`
            : lang === 'en'
              ? 'flexible'
              : 'flexible';

    const labels =
        lang === 'en'
            ? {
                  language: 'Language',
                  days: 'Days',
                  travelDates: 'Travel dates',
                  origin: 'Origin',
                  pace: 'Pace',
                  traveler: 'Traveler',
                  group: 'group',
                  budget: 'Budget',
                  interests: 'Interests',
                  mustVisit: 'Must-visit destination ids',
                  accommodation: 'Accommodation',
                  groundMobility: 'Ground mobility',
                  transport: 'Transport constraints',
                  maxStops: 'Max stops/day',
                  auto: 'auto',
                  none: 'none',
                  mixed: 'mixed',
                  mobilityPrivate: 'private vehicle',
                  mobilityPublic: 'public transport (buses/colectivos)',
                  mobilityMixed: 'mixed (own vehicle to hub, then public/local)',
              }
            : {
                  language: 'Idioma',
                  days: 'Días',
                  travelDates: 'Fechas de viaje',
                  origin: 'Origen',
                  pace: 'Ritmo',
                  traveler: 'Viajero',
                  group: 'grupo',
                  budget: 'Presupuesto',
                  interests: 'Intereses',
                  mustVisit: 'Destinos imprescindibles (ids)',
                  accommodation: 'Hospedaje',
                  groundMobility: 'Movilidad terrestre',
                  transport: 'Restricciones de transporte',
                  maxStops: 'Máx. paradas/día',
                  auto: 'auto',
                  none: 'ninguna',
                  mixed: 'mixto',
                  mobilityPrivate: 'vehículo propio',
                  mobilityPublic: 'transporte público (buzetas/colectivos)',
                  mobilityMixed: 'mixto (propio hasta hub, luego público/local)',
              };

    const mobility = String(request.groundMobility || 'private_vehicle');
    const mobilityLine =
        mobility === 'public_transport'
            ? labels.mobilityPublic
            : mobility === 'mixed'
              ? labels.mobilityMixed
              : labels.mobilityPrivate;

    return [
        `${labels.language}: ${language}`,
        `${labels.days}: ${days}`,
        `${labels.travelDates}: ${dateLine}`,
        `${labels.origin}: ${originLabel}`,
        `${labels.pace}: ${request.pace || 'balanced'}`,
        `${labels.traveler}: ${request.travelerProfile || 'solo'} (${labels.group}: ${request.groupSize ?? 1})`,
        `${labels.budget}: ${budgetLine}`,
        `${labels.interests}: ${interests}`,
        `${labels.mustVisit}: ${mustVisit}`,
        `${labels.accommodation}: ${request.accommodationPreference || labels.mixed}`,
        `${labels.groundMobility}: ${mobilityLine}`,
        `${labels.transport}: ${
            Array.isArray(request.transportConstraints)
                ? request.transportConstraints.join(', ')
                : labels.none
        }`,
        `${labels.maxStops}: ${request.maxStopsPerDay ?? labels.auto}`,
        request.travelerNotes
            ? `${lang === 'en' ? 'Traveler notes (priority)' : 'Notas del viajero (prioridad)'}: ${String(request.travelerNotes).slice(0, 1200)}`
            : '',
    ]
        .filter(Boolean)
        .join('\n');
}
