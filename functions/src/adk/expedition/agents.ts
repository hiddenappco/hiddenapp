import { LlmAgent } from '@google/adk';
import { z } from 'zod';

function expeditionModel(envKey: string, fallback: string): string {
    return process.env[envKey]?.trim() || fallback;
}

const CURATOR_DEFAULT = 'gemini-2.5-pro';
const LOGISTICS_DEFAULT = 'gemini-2.5-pro';
const BUDGET_DEFAULT = 'gemini-2.5-pro';
const WRITER_DEFAULT = 'gemini-2.5-flash';

// ─── 1. Curator ─────────────────────────────────────────────────────────────

const CURATOR_SCHEMA = z.object({
    feasible: z.boolean(),
    note: z.string(),
    selections: z.array(
        z.object({
            destinationId: z.string(),
            reason: z.string(),
        })
    ),
});

let curatorAgent: LlmAgent | null = null;

export function getCuratorAgent(): LlmAgent {
    if (curatorAgent) return curatorAgent;
    curatorAgent = new LlmAgent({
        name: 'hidden-expedition-curator',
        description: 'Selects catalog destinations matching an expedition request.',
        model: expeditionModel('EXPEDITION_CURATOR_MODEL', CURATOR_DEFAULT),
        instruction: `You are the Hidden App expedition CURATOR.
You receive the FULL verified destination catalog of ONE Colombian department (descriptions, gettingThere, pricing, planningNotes, open/closed status).

Select destinations that best match the traveler request.

RULES:
- Use ONLY destinationId values from the catalog. NEVER invent ids.
- NEVER select destinations marked closed or operationalStatus red.
- Honor mustVisitDestinationIds when present — include ALL of them.
- PRIMARY source for duration, access, combinations, and time windows: each destination's planningNotes (sections DURACIÓN, ACCESO, HORARIOS, COMBINAR).
- Respect groundMobility from the request:
  - public_transport: exclude or deprioritize destinations whose planningNotes say vehicle-only; prefer hubs reachable by bus/colectivo; assume fixed departure/return times.
  - private_vehicle: day-trips and flexible schedules are viable when planningNotes allow.
  - mixed: own vehicle to regional hub, then public/local legs per planningNotes.
- Optional suggestedDaysMin/suggestedDaysMax are soft hints only when planningNotes is empty.
- Respect transportConstraints when present (e.g. no lancha → skip boat-only sites).
- Do NOT assume one destination per day. Real trips combine several nearby stops in one day OR spend multiple days in one hub.
- For N days, pick FEWER destinations when travelerNotes ask for depth, rest, or few places (often ceil(N/3) to ceil(N/2) destinations total, not N).
- Pick MORE destinations only when travelerNotes ask for variety or many places — still cluster geographically.
- Read travelerNotes carefully: they override default pacing.
- Maximum 15 destinations total.
- If catalog cannot support requested days, set feasible=true only for what IS possible and explain honestly in "note".
- If zero usable destinations, feasible=false.
- Respond ONLY with valid JSON per the schema.
- ALL string fields (note, reason) MUST be in the mandatory output language from the prompt directive.`,
        outputSchema: CURATOR_SCHEMA,
    });
    return curatorAgent;
}

// ─── 2. Logistics ───────────────────────────────────────────────────────────

const LOGISTICS_SCHEMA = z.object({
    days: z.array(
        z.object({
            day: z.number().int(),
            stopIds: z.array(z.string()),
            overnightRefugioId: z.string(),
            logic: z.string(),
        })
    ),
});

let logisticsAgent: LlmAgent | null = null;

export function getLogisticsAgent(): LlmAgent {
    if (logisticsAgent) return logisticsAgent;
    logisticsAgent = new LlmAgent({
        name: 'hidden-expedition-logistics',
        description: 'Orders destinations into travel days using geography and access modes.',
        model: expeditionModel('EXPEDITION_LOGISTICS_MODEL', LOGISTICS_DEFAULT),
        instruction: `You are the Hidden App expedition LOGISTICS planner.
You receive: full destination fichas (coordinates, gettingThere, planningNotes, regionCluster), distance matrix (km), refugios, traveler origin, groundMobility, pace, and requested days (up to 30).

Assign destinations to days minimizing zig-zag travel and respecting logistics reality.

RULES:
- Every selected destination appears EXACTLY once across the whole trip.
- Read planningNotes for each stop: DURACIÓN, ACCESO, HORARIOS/RESTRICCIONES, COMBINAR — obey departure times, last bus/brujita/lancha windows, and "do not combine" rules.
- groundMobility public_transport: plan around bus/colectivo schedules — fewer stops per day, buffer time at terminals, no night arrivals/departures at remote sites; day-trips from distant cities only when planningNotes explicitly allow with early departure.
- groundMobility private_vehicle: Google Routes driving times are a reasonable baseline between road-accessible points.
- groundMobility mixed: driving to hub, then respect local public/foot/boat legs from planningNotes.
- Multiple stops on the SAME day is normal when stops share a regionCluster or are <40 km apart AND planningNotes allow combining.
- Do NOT assign one distant destination per day by default — that exhausts travelers.
- Hub days: spend 2+ consecutive days in one area with day trips to nearby stops when planningNotes recommend multiple days.
- Rest/light days with 0–1 new stops are valid when there are fewer destinations than days.
- Order stops geographically; start near origin on day 1 when known.
- Do NOT mix distant regionClusters on the same day without strong reason in planningNotes.
- Match pace: relaxed ≤2 stops/day, balanced ≤3, intense ≤4 (unless maxStopsPerDay given); reduce by 1 stop/day cap when groundMobility is public_transport.
- Follow travelerNotes: if they want few places, consolidate stops and allow multi-day hubs.
- Prefer overnight refugios linked to the last stop of the day (exact refugio id or empty string).
- Output MUST have exactly the requested number of days (use lighter/rest days if needed).
- Respond ONLY with valid JSON per the schema.
- ALL string fields (logic) MUST be in the mandatory output language from the prompt directive.`,
        outputSchema: LOGISTICS_SCHEMA,
    });
    return logisticsAgent;
}

// ─── 3. Budget ──────────────────────────────────────────────────────────────

const BUDGET_SCHEMA = z.object({
    totalMin: z.number(),
    totalMax: z.number(),
    perPersonMin: z.number().optional(),
    perPersonMax: z.number().optional(),
    breakdown: z.object({
        transport: z.object({ min: z.number(), max: z.number(), note: z.string() }),
        lodging: z.object({ min: z.number(), max: z.number(), note: z.string() }),
        activities: z.object({ min: z.number(), max: z.number(), note: z.string() }),
        food: z.object({ min: z.number(), max: z.number(), note: z.string() }),
        contingency: z.object({ min: z.number(), max: z.number(), note: z.string() }),
    }),
    assumptions: z.array(z.string()),
    narrative: z.string(),
    confidence: z.enum(['high', 'medium', 'low']),
});

let budgetAgent: LlmAgent | null = null;

export function getBudgetAgent(): LlmAgent {
    if (budgetAgent) return budgetAgent;
    budgetAgent = new LlmAgent({
        name: 'hidden-expedition-budget',
        description: 'Estimates expedition cost from catalog pricingGuide data.',
        model: expeditionModel('EXPEDITION_BUDGET_MODEL', BUDGET_DEFAULT),
        instruction: `You are the Hidden App expedition BUDGET analyst.
You receive: traveler profile, group size, budget mode, deterministic price hints from pricingGuide, refugio rates, and the fixed day plan.

Produce an honest COP budget estimate.

RULES:
- Ground numbers in provided pricingGuide and refugio data. NEVER invent prices.
- If data is missing, widen ranges and set confidence medium/low.
- Include transport, lodging, activities, food, and ~10% contingency.
- Transport line must reflect groundMobility: bus/colectivo fares and terminal hops for public_transport; fuel/tolls/parking for private_vehicle; blend for mixed.
- For budgetMode "open", still estimate totalMin/totalMax.
- narrative: 2–3 sentences for the traveler (max 50 words).
- LANGUAGE: follow the mandatory output-language directive in the prompt.
- Respond ONLY with valid JSON per the schema.`,
        outputSchema: BUDGET_SCHEMA,
    });
    return budgetAgent;
}

// ─── 4. Writer ──────────────────────────────────────────────────────────────

const WRITER_SCHEMA = z.object({
    title: z.string(),
    summary: z.string(),
    days: z.array(
        z.object({
            day: z.number().int(),
            title: z.string(),
            stops: z.array(
                z.object({
                    destinationId: z.string(),
                    name: z.string(),
                    plan: z.string(),
                })
            ),
            refugioNote: z.string(),
            tips: z.string(),
        })
    ),
    packing: z.string(),
});

let writerAgent: LlmAgent | null = null;

export function getWriterAgent(): LlmAgent {
    if (writerAgent) return writerAgent;
    writerAgent = new LlmAgent({
        name: 'hidden-expedition-writer',
        description: 'Writes the final day-by-day expedition itinerary.',
        model: expeditionModel('EXPEDITION_WRITER_MODEL', WRITER_DEFAULT),
        instruction: `You are the Hidden App expedition WRITER.
You receive: fixed day-by-day skeleton (do NOT reorder), full destination fichas, refugio details, real Google Routes legs, coupons, events, budget summary, and traveler profile.

Write the final itinerary.

RULES:
- Keep EXACT structure: same days, stops, destinationIds.
- Ground claims in provided data: activities, gettingThere, planningNotes, pricingGuide, packing.
- Mention groundMobility in travel tips when public_transport or mixed: bus terminals, first/last departure, cash for colectivos.
- When Google Routes legs are provided, note they assume private driving — add buffer for public transport per planningNotes.
- Mention coupons/events when they apply; include coupon codes from catalog data.
- When COUPONS ASSIGNED BY DAY lists coupons for a day, reference them in that day's tips or stop plans.
- Days with multiple stops: write a calm morning/afternoon flow — do not rush the traveler.
- Tone: expert local guide — warm, tactical, concise.
- LANGUAGE: follow the mandatory output-language directive.
- Respond ONLY with valid JSON per the schema.`,
        outputSchema: WRITER_SCHEMA,
    });
    return writerAgent;
}
