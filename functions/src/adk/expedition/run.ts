import { db, admin } from '../../config/firebase';
import { getRouteAnalysis } from '../../api/routes';
import {
    getCouponsKnowledge,
    getDestinationsKnowledge,
    getEventsKnowledge,
    getRefugiosKnowledge,
} from '../chat/knowledge';
import { buildLanguageDirective, type AppLanguage } from '../chat/briefing';
import { parseAgentJsonResponse } from '../parseJson';
import { runAgentEphemeral } from '../runner';
import { getCuratorAgent, getLogisticsAgent, getWriterAgent } from './agents';

export interface ExpeditionRequest {
    days: number;
    originLabel?: string;
    originLat?: number;
    originLng?: number;
    interests?: string[];
    budget?: string;
}

interface ExpeditionDoc {
    userId: string;
    departmentId: string;
    language: AppLanguage;
    request: ExpeditionRequest;
    status: string;
}

type Row = Record<string, unknown>;

const MAX_ROUTE_LEGS = 10;

// ─── Helpers ────────────────────────────────────────────────────────────────

function stripHtml(value: unknown, maxLen = 350): string {
    const text = String(value ?? '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&[a-zA-Z#0-9]+;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    return text.length > maxLen ? `${text.slice(0, maxLen)}…` : text;
}

function coordsOf(row: Row): { lat: number; lng: number } | null {
    const c = row.coordinates as { lat?: number; lng?: number } | null | undefined;
    if (c && typeof c.lat === 'number' && typeof c.lng === 'number') return { lat: c.lat, lng: c.lng };
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

function formatDuration(rawSeconds: string | undefined): string {
    const seconds = parseInt(String(rawSeconds || '').replace(/s$/i, ''), 10);
    if (!Number.isFinite(seconds) || seconds <= 0) return '';
    const h = Math.floor(seconds / 3600);
    const m = Math.round((seconds % 3600) / 60);
    return h > 0 ? `${h} h ${m} min` : `${m} min`;
}

async function computeLeg(
    from: { lat: number; lng: number },
    to: { lat: number; lng: number }
): Promise<{ durationText: string; distanceText: string } | null> {
    const analysis = await getRouteAnalysis(from.lat, from.lng, to.lat, to.lng);
    const route = analysis?.routes?.[0];
    if (!route) return null;
    const durationText = formatDuration(route.duration);
    const distanceKm = route.distanceMeters ? (route.distanceMeters / 1000).toFixed(0) : '';
    if (!durationText && !distanceKm) return null;
    return {
        durationText,
        distanceText: distanceKm ? `${distanceKm} km` : '',
    };
}

// ─── Pipeline ───────────────────────────────────────────────────────────────

/**
 * Runs the full multi-agent expedition pipeline for a queued expedition doc:
 * deterministic catalog gathering → curator → routing (real Google Routes
 * legs) → logistics → writer. Progress is streamed to Firestore so the chat
 * widget can render live status.
 */
export async function runExpeditionPipeline(expeditionId: string): Promise<void> {
    const docRef = db.collection('expeditions').doc(expeditionId);
    const snap = await docRef.get();
    if (!snap.exists) throw new Error(`Expedition ${expeditionId} not found`);

    const data = snap.data() as unknown as ExpeditionDoc;
    const { departmentId, language, request } = data;
    const days = Math.max(1, Math.min(10, Number(request?.days) || 1));

    const setStatus = (status: string, extra: Record<string, unknown> = {}) =>
        docRef.set(
            { status, updatedAt: admin.firestore.FieldValue.serverTimestamp(), ...extra },
            { merge: true }
        );

    try {
        // 1. Deterministic catalog gathering (no LLM, no hallucination surface)
        await setStatus('curating');

        const scope = { departmentId };
        const [destinations, refugios, coupons, events] = await Promise.all([
            getDestinationsKnowledge(scope, { limit: 40 }),
            getRefugiosKnowledge(scope, { limit: 40 }),
            getCouponsKnowledge(scope, { limit: 10 }),
            getEventsKnowledge(scope, { limit: 10 }),
        ]);

        if (destinations.length === 0) {
            await setStatus('error', { error: 'EMPTY_CATALOG' });
            return;
        }

        const destById = new Map(destinations.map((d) => [String(d.id), d]));

        // 2. Curator
        const curatorCatalog = destinations.map((d) => ({
            id: d.id,
            title: d.title,
            location: d.location,
            description: stripHtml(d.description, 220),
            hiking: (d.stats as Row | undefined)?.hiking ?? d.hiking ?? '',
            activities: d.activities ?? [],
            isCoastal: d.isCoastal ?? '',
        }));

        const curatorPrompt = `EXPEDITION REQUEST:
- Days: ${days}
- Origin: ${request.originLabel || (request.originLat ? `${request.originLat}, ${request.originLng}` : 'unknown')}
- Interests: ${request.interests?.length ? request.interests.join(', ') : 'general'}
- Budget: ${request.budget || 'not specified'}

DESTINATION CATALOG (department: ${departmentId}):
${JSON.stringify(curatorCatalog)}`;

        const curatorRaw = parseAgentJsonResponse(
            await runAgentEphemeral(getCuratorAgent(), curatorPrompt, expeditionId, 'hidden-expedition')
        );

        const selections = (Array.isArray(curatorRaw.selections) ? curatorRaw.selections : [])
            .map((s: Row) => ({ destinationId: String(s.destinationId || ''), reason: String(s.reason || '') }))
            .filter((s) => destById.has(s.destinationId))
            .slice(0, 8);

        if (!curatorRaw.feasible || selections.length === 0) {
            await setStatus('error', {
                error: 'NOT_FEASIBLE',
                note: String(curatorRaw.note || 'El catálogo actual no permite armar esta expedición.'),
            });
            return;
        }

        // 3. Logistics (straight-line matrix for ordering decisions)
        await setStatus('routing');

        const selected = selections.map((s) => destById.get(s.destinationId)!);
        const matrix: Record<string, Record<string, number>> = {};
        for (const a of selected) {
            const ca = coordsOf(a);
            if (!ca) continue;
            matrix[String(a.id)] = {};
            for (const b of selected) {
                if (a.id === b.id) continue;
                const cb = coordsOf(b);
                if (cb) matrix[String(a.id)][String(b.id)] = haversineKm(ca, cb);
            }
        }

        const refugiosCompact = refugios.map((r) => ({
            id: r.id,
            name: r.name,
            location: r.location,
            destinationId: r.destinationId ?? [],
            type: r.type ?? [],
        }));

        const origin =
            typeof request.originLat === 'number' && typeof request.originLng === 'number'
                ? { lat: request.originLat, lng: request.originLng }
                : null;

        const logisticsPrompt = `REQUESTED DAYS: ${days}
TRAVELER ORIGIN: ${request.originLabel || (origin ? `${origin.lat}, ${origin.lng}` : 'unknown')}

SELECTED DESTINATIONS:
${JSON.stringify(selected.map((d) => ({ id: d.id, title: d.title, location: d.location, coordinates: coordsOf(d) })))}

DISTANCE MATRIX (straight-line km between destination ids):
${JSON.stringify(matrix)}

AVAILABLE REFUGIOS (lodging, with linked destination ids):
${JSON.stringify(refugiosCompact)}`;

        const logisticsRaw = parseAgentJsonResponse(
            await runAgentEphemeral(getLogisticsAgent(), logisticsPrompt, expeditionId, 'hidden-expedition')
        );

        const refugioById = new Map(refugios.map((r) => [String(r.id), r]));
        const planDays = (Array.isArray(logisticsRaw.days) ? logisticsRaw.days : [])
            .map((d: Row) => ({
                day: Number(d.day) || 0,
                stopIds: (Array.isArray(d.stopIds) ? d.stopIds : [])
                    .map((id: unknown) => String(id))
                    .filter((id: string) => destById.has(id)),
                overnightRefugioId: refugioById.has(String(d.overnightRefugioId))
                    ? String(d.overnightRefugioId)
                    : '',
            }))
            .filter((d) => d.day > 0 && d.stopIds.length > 0)
            .sort((a, b) => a.day - b.day);

        if (planDays.length === 0) {
            await setStatus('error', { error: 'ROUTING_FAILED' });
            return;
        }

        // 4. Real route legs (Google Routes) along the fixed visit order
        const orderedStops: Array<{ id: string; coords: { lat: number; lng: number } | null }> = [];
        for (const d of planDays) {
            for (const stopId of d.stopIds) {
                orderedStops.push({ id: stopId, coords: coordsOf(destById.get(stopId)!) });
            }
        }

        const legs: Record<string, { durationText: string; distanceText: string }> = {};
        let prev: { id: string; coords: { lat: number; lng: number } | null } | null = origin
            ? { id: '__origin__', coords: origin }
            : null;
        let legCount = 0;
        for (const stop of orderedStops) {
            if (prev?.coords && stop.coords && legCount < MAX_ROUTE_LEGS) {
                const leg = await computeLeg(prev.coords, stop.coords);
                if (leg) {
                    legs[`${prev.id}→${stop.id}`] = leg;
                    legCount++;
                }
            }
            prev = stop;
        }

        // 5. Writer
        await setStatus('writing');

        const writerDestinations = selected.map((d) => ({
            id: d.id,
            title: d.title,
            location: d.location,
            description: stripHtml(d.description, 350),
            activities: d.activities ?? [],
            aiTip: stripHtml(d.aiTip, 150),
            pricingGuide: d.pricingGuide ?? '',
            packingSummary: stripHtml(d.packingSummary, 200),
        }));

        const writerPrompt = `${buildLanguageDirective(language)}

TRAVELER REQUEST: ${days} days | interests: ${request.interests?.join(', ') || 'general'} | budget: ${request.budget || 'n/a'} | origin: ${request.originLabel || 'n/a'}

FIXED DAY-BY-DAY SKELETON (do not reorder):
${JSON.stringify(planDays)}

REAL TRAVEL LEGS (driving, Google Routes; key = fromId→toId):
${JSON.stringify(legs)}

DESTINATION DETAILS:
${JSON.stringify(writerDestinations)}

REFUGIO DETAILS:
${JSON.stringify(planDays.filter((d) => d.overnightRefugioId).map((d) => {
    const r = refugioById.get(d.overnightRefugioId)!;
    return { id: r.id, name: r.name, location: r.location, pricingGuide: r.pricingGuide ?? '', howToBook: stripHtml(r.howToBook, 150) };
}))}

COUPONS AVAILABLE:
${JSON.stringify(coupons.map((c) => ({ id: c.id, title: c.title, discount: c.discount, location: c.location })))}

EVENTS (check date overlap before mentioning):
${JSON.stringify(events.map((e) => ({ id: e.id, name: e.name, date: e.date, location: e.location })))}`;

        const writerRaw = parseAgentJsonResponse(
            await runAgentEphemeral(getWriterAgent(), writerPrompt, expeditionId, 'hidden-expedition')
        );

        if (!writerRaw.title || !Array.isArray(writerRaw.days)) {
            await setStatus('error', { error: 'WRITER_FAILED' });
            return;
        }

        // 6. Assemble final itinerary: writer narrative + deterministic data
        const itineraryDays = (writerRaw.days as Row[]).map((wd) => {
            const skeleton = planDays.find((p) => p.day === Number(wd.day));
            const refugio = skeleton?.overnightRefugioId
                ? refugioById.get(skeleton.overnightRefugioId)
                : null;

            const stops = (Array.isArray(wd.stops) ? (wd.stops as Row[]) : []).map((s, idx) => {
                const stopId = String(s.destinationId || '');
                let travel: { durationText: string; distanceText: string } | null = null;
                const allStopIds = skeleton?.stopIds || [];
                const prevId = idx === 0
                    ? (Number(wd.day) === 1 ? '__origin__' : findPreviousStopId(planDays, Number(wd.day)))
                    : allStopIds[idx - 1];
                if (prevId) travel = legs[`${prevId}→${stopId}`] ?? null;

                return {
                    destinationId: stopId,
                    name: String(s.name || destById.get(stopId)?.title || ''),
                    plan: String(s.plan || ''),
                    travel,
                };
            });

            return {
                day: Number(wd.day) || 0,
                title: String(wd.title || ''),
                stops,
                refugio: refugio ? { id: String(refugio.id), name: String(refugio.name) } : null,
                refugioNote: String(wd.refugioNote || ''),
                tips: String(wd.tips || ''),
            };
        });

        await setStatus('ready', {
            itinerary: {
                title: String(writerRaw.title),
                summary: String(writerRaw.summary || ''),
                days: itineraryDays,
                packing: String(writerRaw.packing || ''),
                curatorNote: String(curatorRaw.note || ''),
            },
        });

        console.log(`[expedition] Pipeline ready: ${expeditionId} (${itineraryDays.length} days)`);
    } catch (err) {
        console.error(`[expedition] Pipeline failed for ${expeditionId}:`, err);
        await setStatus('error', { error: String((err as Error).message || err) });
    }
}

function findPreviousStopId(
    planDays: Array<{ day: number; stopIds: string[] }>,
    day: number
): string | null {
    const prevDay = planDays.filter((d) => d.day < day).sort((a, b) => b.day - a.day)[0];
    if (!prevDay || prevDay.stopIds.length === 0) return null;
    return prevDay.stopIds[prevDay.stopIds.length - 1];
}
