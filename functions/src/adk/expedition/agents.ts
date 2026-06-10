import { LlmAgent } from '@google/adk';
import { z } from 'zod';

/**
 * Multi-agent expedition planner — sequential pipeline of three specialist
 * ADK agents. None of them has tools, so outputSchema (forced JSON) is valid.
 * All real data is gathered deterministically and injected in the prompt:
 * the agents interpret, they never invent catalog entries.
 */

// ─── 1. Curator — selects destinations matching the request ────────────────

const CURATOR_SCHEMA = z.object({
    feasible: z.boolean().describe('Whether a worthwhile plan is possible with this catalog.'),
    note: z.string().describe('Honest note: limitations, why these picks, or why not feasible.'),
    selections: z
        .array(
            z.object({
                destinationId: z.string().describe('EXACT destination id from the catalog.'),
                reason: z.string().describe('Why this destination fits the request (short).'),
            })
        )
        .describe('Chosen destinations, between 1 and 8. Empty if not feasible.'),
});

let curatorAgent: LlmAgent | null = null;

export function getCuratorAgent(): LlmAgent {
    if (curatorAgent) return curatorAgent;
    curatorAgent = new LlmAgent({
        name: 'hidden-expedition-curator',
        description: 'Selects catalog destinations that best match an expedition request.',
        model: 'gemini-2.5-flash',
        instruction: `You are the Hidden App expedition CURATOR.
You receive: an expedition request (days, origin, interests, budget) and the verified destination catalog of ONE Colombian department.
Select the destinations that best match the request.

RULES:
- Use ONLY destinationId values that appear in the catalog. NEVER invent ids.
- Pick roughly 1-2 destinations per travel day (e.g. 3 days → 3-5 destinations). Fewer is fine if the catalog is small.
- Respect interests and hiking difficulty when provided.
- CATALOG HONESTY: if the catalog cannot support the requested days, set feasible=true only for what IS possible and explain in "note" (e.g. catalog supports 1 day, not 3). If there are zero usable destinations, feasible=false.
- Respond ONLY with valid JSON per the schema.`,
        outputSchema: CURATOR_SCHEMA,
    });
    return curatorAgent;
}

// ─── 2. Logistics — orders stops into days using real geography ─────────────

const LOGISTICS_SCHEMA = z.object({
    days: z
        .array(
            z.object({
                day: z.number().int().describe('Day number starting at 1.'),
                stopIds: z.array(z.string()).describe('Destination ids visited this day, in visit order.'),
                overnightRefugioId: z
                    .string()
                    .describe('Refugio id for this night, or empty string if none applies.'),
                logic: z.string().describe('One-line routing rationale for this day.'),
            })
        )
        .describe('Day-by-day plan covering every selected destination exactly once.'),
});

let logisticsAgent: LlmAgent | null = null;

export function getLogisticsAgent(): LlmAgent {
    if (logisticsAgent) return logisticsAgent;
    logisticsAgent = new LlmAgent({
        name: 'hidden-expedition-logistics',
        description: 'Orders selected destinations into travel days using distances and lodging.',
        model: 'gemini-2.5-flash',
        instruction: `You are the Hidden App expedition LOGISTICS planner.
You receive: selected destinations (with coordinates), a distance matrix in kilometers (straight-line), available refugios (lodging) with the destinations they are linked to, the number of travel days, and the traveler's origin.

Your job: assign destinations to days minimizing zig-zag travel.

RULES:
- Every selected destination appears EXACTLY once across all days.
- Order stops geographically: consecutive stops should be close; start from the origin when known.
- Prefer overnight refugios linked (destinationId link) to that day's last stop. Use the EXACT refugio id, or empty string when no linked refugio exists. NEVER invent ids.
- Number of days must equal the requested days (or fewer if the curator selected very few destinations).
- Respond ONLY with valid JSON per the schema.`,
        outputSchema: LOGISTICS_SCHEMA,
    });
    return logisticsAgent;
}

// ─── 3. Writer — final traveler-facing itinerary ────────────────────────────

const WRITER_SCHEMA = z.object({
    title: z.string().describe('Short inspiring expedition title.'),
    summary: z.string().describe('2-3 sentence overview of the expedition (max 60 words).'),
    days: z.array(
        z.object({
            day: z.number().int(),
            title: z.string().describe('Short title for the day.'),
            stops: z.array(
                z.object({
                    destinationId: z.string().describe('EXACT id from the skeleton.'),
                    name: z.string(),
                    plan: z.string().describe('What to do here: activities, timing, practical advice (max 50 words).'),
                })
            ),
            refugioNote: z.string().describe('Overnight plan referencing the assigned refugio, or empty string.'),
            tips: z.string().describe('One tactical tip for the day (food, safety, timing), or empty string.'),
        })
    ),
    packing: z.string().describe('Compact packing recommendation for the whole trip (max 40 words).'),
});

let writerAgent: LlmAgent | null = null;

export function getWriterAgent(): LlmAgent {
    if (writerAgent) return writerAgent;
    writerAgent = new LlmAgent({
        name: 'hidden-expedition-writer',
        description: 'Writes the final day-by-day expedition itinerary for the explorer.',
        model: 'gemini-2.5-flash',
        instruction: `You are the Hidden App expedition WRITER.
You receive: a fixed day-by-day skeleton (already routed — do NOT reorder it), full destination details, refugio details, real travel times between stops, applicable coupons and events, and the traveler's profile.

Write the final itinerary the explorer will read.

RULES:
- Keep the EXACT structure and stop order of the skeleton. Same days, same stops, same destinationIds.
- Ground every claim in the provided data: activities from the destination ficha, prices from pricingGuide, packing from packingSummary. NEVER invent prices, places or services.
- Mention coupons or events naturally in the relevant day when they apply.
- Tone: expert local guide — warm, tactical, concise.
- LANGUAGE: write ALL text fields strictly in the language demanded by the mandatory output-language directive at the top of the input. This overrides everything else.
- Respond ONLY with valid JSON per the schema.`,
        outputSchema: WRITER_SCHEMA,
    });
    return writerAgent;
}
