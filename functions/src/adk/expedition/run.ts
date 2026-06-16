import { db, admin } from '../../config/firebase';
import { getRouteAnalysis } from '../../api/routes';
import {
    getCouponsKnowledge,
    getDepartmentKnowledge,
    getDestinationsKnowledge,
    getEventsKnowledge,
    getRefugiosKnowledge,
} from '../chat/knowledge';
import { buildLanguageDirective, type AppLanguage } from '../chat/briefing';
import { parseAgentJsonResponse } from '../parseJson';
import { runAgentEphemeral } from '../runner';
import {
    buildCuratorCatalog,
    buildPlannerDestination,
    buildRefugioPlannerRow,
    buildRequestSummary,
    isDestinationOpen,
} from './catalog';
import { getBudgetAgent, getCuratorAgent, getLogisticsAgent, getWriterAgent } from './agents';
import type { ExpeditionBudgetEstimate, ExpeditionDoc, ExpeditionRequest, GroundMobility } from './types';
import { GROUND_MOBILITY_VALUES } from './types';
import { validateExpeditionPlan } from './validatePlan';
import { expeditionMessage } from './messages';
import {
    assignCouponsToPlan,
    assignDepartmentCoupons,
    flattenCouponWidgets,
} from './couponWidgets';

type Row = Record<string, unknown>;

const MAX_DAYS = 30;
const MAX_SELECTIONS = 15;
const MAX_ROUTE_LEGS = 45;

function normalizeRequest(raw: ExpeditionRequest): ExpeditionRequest {
    const origin = raw.origin ?? {
        label: raw.originLabel || '',
        lat: raw.originLat ?? null,
        lng: raw.originLng ?? null,
    };
    return {
        ...raw,
        days: Math.max(1, Math.min(MAX_DAYS, Number(raw.days) || 1)),
        origin,
        pace: raw.pace || 'balanced',
        budgetMode: raw.budgetMode || (raw.budget_legacy ? 'fixed' : 'open'),
        budget: raw.budget ?? {
            amountCOP: raw.budget_legacy ? parseInt(String(raw.budget_legacy).replace(/\D/g, ''), 10) || null : null,
        },
        interests: raw.interests?.length ? raw.interests : ['general'],
        travelerProfile: raw.travelerProfile || 'solo',
        mustVisitDestinationIds: raw.mustVisitDestinationIds ?? [],
        groundMobility: GROUND_MOBILITY_VALUES.includes(raw.groundMobility as GroundMobility)
            ? raw.groundMobility
            : 'private_vehicle',
        travelerNotes: raw.travelerNotes ? String(raw.travelerNotes).trim().slice(0, 1200) : undefined,
    };
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

function formatDuration(rawSeconds: string | undefined, lang: AppLanguage): string {
    const seconds = parseInt(String(rawSeconds || '').replace(/s$/i, ''), 10);
    if (!Number.isFinite(seconds) || seconds <= 0) return '';
    const h = Math.floor(seconds / 3600);
    const m = Math.round((seconds % 3600) / 60);
    const hUnit = lang === 'en' ? 'h' : 'h';
    const minUnit = lang === 'en' ? 'min' : 'min';
    return h > 0 ? `${h} ${hUnit} ${m} ${minUnit}` : `${m} ${minUnit}`;
}

async function computeLeg(
    from: { lat: number; lng: number },
    to: { lat: number; lng: number },
    lang: AppLanguage
): Promise<{ durationText: string; distanceText: string } | null> {
    const analysis = await getRouteAnalysis(from.lat, from.lng, to.lat, to.lng, {
        languageCode: lang === 'en' ? 'en' : 'es',
    });
    const route = analysis?.routes?.[0];
    if (!route) return null;
    const durationText = formatDuration(route.duration, lang);
    const distanceKm = route.distanceMeters ? (route.distanceMeters / 1000).toFixed(0) : '';
    if (!durationText && !distanceKm) return null;
    const kmLabel = lang === 'en' ? 'km' : 'km';
    return {
        durationText,
        distanceText: distanceKm ? `${distanceKm} ${kmLabel}` : '',
    };
}

function sumPricingHints(destinations: Row[]): { min: number; max: number } {
    let min = 0;
    let max = 0;
    for (const d of destinations) {
        const guide = d.pricingGuide;
        if (!Array.isArray(guide)) continue;
        for (const item of guide) {
            const p = item as Row;
            const pMin = Number(p.precio_min ?? p.min ?? 0);
            const pMax = Number(p.precio_max ?? p.max ?? pMin);
            if (Number.isFinite(pMin)) min += pMin;
            if (Number.isFinite(pMax)) max += pMax;
        }
    }
    return { min, max };
}

function findPreviousStopId(
    planDays: Array<{ day: number; stopIds: string[] }>,
    day: number
): string | null {
    const prevDay = planDays.filter((d) => d.day < day).sort((a, b) => b.day - a.day)[0];
    if (!prevDay || prevDay.stopIds.length === 0) return null;
    return prevDay.stopIds[prevDay.stopIds.length - 1];
}

/**
 * Multi-agent expedition pipeline: full catalog → curator (Pro) → logistics (Pro) →
 * Routes → budget (Pro) → writer (Flash). Progress streams to Firestore.
 */
export async function runExpeditionPipeline(expeditionId: string): Promise<void> {
    const docRef = db.collection('expeditions').doc(expeditionId);
    const snap = await docRef.get();
    if (!snap.exists) throw new Error(`Expedition ${expeditionId} not found`);

    const data = snap.data() as unknown as ExpeditionDoc;
    const { departmentId, language } = data;
    const request = normalizeRequest(data.request);

    const setStatus = (status: string, extra: Record<string, unknown> = {}) =>
        docRef.set(
            { status, updatedAt: admin.firestore.FieldValue.serverTimestamp(), ...extra },
            { merge: true }
        );

    try {
        await setStatus('curating');

        const scope = { departmentId, appLanguage: language };
        const [allDestinations, refugios, coupons, events, department] = await Promise.all([
            getDestinationsKnowledge(scope, { limit: 80 }),
            getRefugiosKnowledge(scope, { limit: 60 }),
            getCouponsKnowledge(scope, { limit: 40 }),
            getEventsKnowledge(scope, { limit: 20 }),
            getDepartmentKnowledge(scope),
        ]);

        const openDestinations = allDestinations.filter(isDestinationOpen);
        if (openDestinations.length === 0) {
            await setStatus('error', { error: 'EMPTY_CATALOG' });
            return;
        }

        const destById = new Map(openDestinations.map((d) => [String(d.id), d]));
        const curatorCatalog = buildCuratorCatalog(openDestinations);

        const curatorPrompt = `${buildLanguageDirective(language)}

${buildRequestSummary(request as unknown as Row, language)}

DEPARTMENT BRIEFING:
${JSON.stringify(department ?? {})}

DESTINATION CATALOG (${openDestinations.length} open, department: ${departmentId}):
${JSON.stringify(curatorCatalog)}

Write all JSON string fields (note, reason) in the mandatory output language.`;

        const curatorRaw = parseAgentJsonResponse(
            await runAgentEphemeral(getCuratorAgent(), curatorPrompt, expeditionId, 'hidden-expedition')
        );

        let selections = (Array.isArray(curatorRaw.selections) ? curatorRaw.selections : [])
            .map((s: Row) => ({ destinationId: String(s.destinationId || ''), reason: String(s.reason || '') }))
            .filter((s) => destById.has(s.destinationId));

        for (const mustId of request.mustVisitDestinationIds ?? []) {
            if (destById.has(mustId) && !selections.some((s) => s.destinationId === mustId)) {
                selections.push({
                    destinationId: mustId,
                    reason: expeditionMessage(language, 'MUST_VISIT_REASON'),
                });
            }
        }

        selections = selections.slice(0, MAX_SELECTIONS);

        if (!curatorRaw.feasible || selections.length === 0) {
            await setStatus('error', {
                error: 'NOT_FEASIBLE',
                note: String(curatorRaw.note || expeditionMessage(language, 'NOT_FEASIBLE_DEFAULT')),
            });
            return;
        }

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

        const refugiosPlanner = refugios.map(buildRefugioPlannerRow);
        const refugioById = new Map(refugios.map((r) => [String(r.id), r]));

        const originLat = request.origin.lat ?? request.originLat;
        const originLng = request.origin.lng ?? request.originLng;
        const origin =
            typeof originLat === 'number' && typeof originLng === 'number'
                ? { lat: originLat, lng: originLng }
                : null;

        const logisticsPrompt = `${buildLanguageDirective(language)}

${buildRequestSummary(request as unknown as Row, language)}

SELECTED DESTINATIONS (full fichas):
${JSON.stringify(selected.map(buildPlannerDestination))}

DISTANCE MATRIX (straight-line km):
${JSON.stringify(matrix)}

REFUGIOS:
${JSON.stringify(refugiosPlanner)}

Write all JSON string fields (logic) in the mandatory output language.`;

        const logisticsRaw = parseAgentJsonResponse(
            await runAgentEphemeral(getLogisticsAgent(), logisticsPrompt, expeditionId, 'hidden-expedition')
        );

        let planDays = (Array.isArray(logisticsRaw.days) ? logisticsRaw.days : [])
            .map((d: Row) => ({
                day: Number(d.day) || 0,
                stopIds: (Array.isArray(d.stopIds) ? d.stopIds : [])
                    .map((id: unknown) => String(id))
                    .filter((id: string) => destById.has(id)),
                overnightRefugioId: refugioById.has(String(d.overnightRefugioId))
                    ? String(d.overnightRefugioId)
                    : '',
            }))
            .filter((d) => d.day > 0)
            .sort((a, b) => a.day - b.day);

        const validation = validateExpeditionPlan(request, planDays, destById);
        if (!validation.ok && validation.issues.some((i) => i.code === 'EMPTY_PLAN' || i.code === 'MUST_VISIT_MISSING')) {
            await setStatus('error', { error: 'ROUTING_FAILED', note: validation.note || expeditionMessage(language, 'ROUTING_FAILED_NOTE') });
            return;
        }

        if (planDays.length === 0) {
            await setStatus('error', { error: 'ROUTING_FAILED' });
            return;
        }

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
                const leg = await computeLeg(prev.coords, stop.coords, language);
                if (leg) {
                    legs[`${prev.id}→${stop.id}`] = leg;
                    legCount++;
                }
            }
            prev = stop;
        }

        const couponAssignments = assignCouponsToPlan(planDays, coupons);
        const usedCouponIds = new Set(couponAssignments.flatMap((a) => a.coupons.map((c) => c.id)));
        const departmentCoupons = assignDepartmentCoupons(coupons, usedCouponIds);
        const couponWidgets = flattenCouponWidgets(couponAssignments);

        await setStatus('budgeting');

        const priceHints = sumPricingHints(selected.map(buildPlannerDestination));
        const groupSize = Math.max(1, Number(request.groupSize) || (request.travelerProfile === 'couple' ? 2 : 1));

        const budgetPrompt = `${buildLanguageDirective(language)}

${buildRequestSummary(request as unknown as Row, language)}

GROUP SIZE: ${groupSize}
DETERMINISTIC PRICING HINTS FROM CATALOG (COP, activities only): min ${priceHints.min}, max ${priceHints.max}

DAY PLAN:
${JSON.stringify(planDays)}

DESTINATIONS PRICING:
${JSON.stringify(selected.map((d) => ({ id: d.id, title: d.title, pricingGuide: buildPlannerDestination(d).pricingGuide })))}

REFUGIOS PRICING:
${JSON.stringify(
    planDays
        .filter((d) => d.overnightRefugioId)
        .map((d) => {
            const r = refugioById.get(d.overnightRefugioId)!;
            return { id: r.id, name: r.name, pricingGuide: buildRefugioPlannerRow(r).pricingGuide };
        })
)}`;

        let budgetEstimate: ExpeditionBudgetEstimate | null = null;
        try {
            const budgetRaw = parseAgentJsonResponse(
                await runAgentEphemeral(getBudgetAgent(), budgetPrompt, expeditionId, 'hidden-expedition')
            );
            budgetEstimate = {
                currency: 'COP',
                totalMin: Number(budgetRaw.totalMin) || priceHints.min,
                totalMax: Number(budgetRaw.totalMax) || priceHints.max,
                perPersonMin: budgetRaw.perPersonMin != null ? Number(budgetRaw.perPersonMin) : undefined,
                perPersonMax: budgetRaw.perPersonMax != null ? Number(budgetRaw.perPersonMax) : undefined,
                breakdown: budgetRaw.breakdown as ExpeditionBudgetEstimate['breakdown'],
                assumptions: Array.isArray(budgetRaw.assumptions) ? budgetRaw.assumptions.map(String) : [],
                narrative: String(budgetRaw.narrative || ''),
                confidence: (['high', 'medium', 'low'].includes(String(budgetRaw.confidence))
                    ? budgetRaw.confidence
                    : 'medium') as ExpeditionBudgetEstimate['confidence'],
            };
        } catch (budgetErr) {
            console.warn('[expedition] Budget agent failed, using hints:', budgetErr);
            budgetEstimate = {
                currency: 'COP',
                totalMin: priceHints.min,
                totalMax: Math.max(priceHints.max, priceHints.min),
                perPersonMin: Math.round(priceHints.min / groupSize),
                perPersonMax: Math.round(Math.max(priceHints.max, priceHints.min) / groupSize),
                breakdown: {
                    transport: { min: 0, max: 0, note: '' },
                    lodging: { min: 0, max: 0, note: '' },
                    activities: {
                        min: priceHints.min,
                        max: priceHints.max,
                        note: expeditionMessage(language, 'BUDGET_ACTIVITIES_NOTE'),
                    },
                    food: { min: 0, max: 0, note: '' },
                    contingency: { min: 0, max: 0, note: '' },
                },
                assumptions: [expeditionMessage(language, 'BUDGET_FALLBACK_ASSUMPTION')],
                narrative: '',
                confidence: 'low',
            };
        }

        await setStatus('writing');

        const writerDestinations = selected.map(buildPlannerDestination);

        const writerPrompt = `${buildLanguageDirective(language)}

${buildRequestSummary(request as unknown as Row, language)}

FIXED DAY-BY-DAY SKELETON (do not reorder):
${JSON.stringify(planDays)}

REAL TRAVEL LEGS (Google Routes):
${JSON.stringify(legs)}

DESTINATION DETAILS:
${JSON.stringify(writerDestinations)}

REFUGIO DETAILS:
${JSON.stringify(
    planDays
        .filter((d) => d.overnightRefugioId)
        .map((d) => buildRefugioPlannerRow(refugioById.get(d.overnightRefugioId)!))
)}

BUDGET ESTIMATE:
${JSON.stringify(budgetEstimate)}

COUPONS (full catalog):
${JSON.stringify(coupons.map((c) => ({
    id: c.id,
    title: c.title,
    discount: c.discount,
    location: c.location,
    destinationId: c.destinationId,
    isPremium: c.isPremium ?? false,
    coupon_code: c.coupon_code,
})))}

COUPONS ASSIGNED BY DAY (you MUST mention these in the matching day):
${JSON.stringify(couponAssignments)}

DEPARTMENT-WIDE COUPONS (mention in summary if relevant):
${JSON.stringify(departmentCoupons)}

EVENTS:
${JSON.stringify(events.map((e) => ({ id: e.id, name: e.name, date: e.date, location: e.location })))}

VALIDATION NOTES: ${validation.note || 'ok'}`;

        const writerRaw = parseAgentJsonResponse(
            await runAgentEphemeral(getWriterAgent(), writerPrompt, expeditionId, 'hidden-expedition')
        );

        if (!writerRaw.title || !Array.isArray(writerRaw.days)) {
            await setStatus('error', { error: 'WRITER_FAILED' });
            return;
        }

        const itineraryDays = (writerRaw.days as Row[]).map((wd) => {
            const skeleton = planDays.find((p) => p.day === Number(wd.day));
            const refugio = skeleton?.overnightRefugioId
                ? refugioById.get(skeleton.overnightRefugioId)
                : null;

            const stops = (Array.isArray(wd.stops) ? (wd.stops as Row[]) : []).map((s, idx) => {
                const stopId = String(s.destinationId || '');
                let travel: { durationText: string; distanceText: string } | null = null;
                const allStopIds = skeleton?.stopIds || [];
                const prevId =
                    idx === 0
                        ? Number(wd.day) === 1
                            ? '__origin__'
                            : findPreviousStopId(planDays, Number(wd.day))
                        : allStopIds[idx - 1];
                if (prevId) travel = legs[`${prevId}→${stopId}`] ?? null;

                return {
                    destinationId: stopId,
                    name: String(s.name || destById.get(stopId)?.title || ''),
                    plan: String(s.plan || ''),
                    travel,
                };
            });

            const dayCouponAssignment = couponAssignments.find((a) => a.day === Number(wd.day));

            return {
                day: Number(wd.day) || 0,
                title: String(wd.title || ''),
                stops,
                refugio: refugio ? { id: String(refugio.id), name: String(refugio.name) } : null,
                refugioNote: String(wd.refugioNote || ''),
                tips: String(wd.tips || ''),
                coupons: dayCouponAssignment?.coupons.map((c) => ({
                    id: c.id,
                    isPremium: c.isPremium,
                    title: c.title,
                    discount: c.discount,
                })) ?? [],
            };
        });

        await setStatus('ready', {
            itinerary: {
                title: String(writerRaw.title),
                summary: String(writerRaw.summary || ''),
                days: itineraryDays,
                packing: String(writerRaw.packing || ''),
                curatorNote: String(curatorRaw.note || ''),
                travelContext: {
                    groundMobility: request.groundMobility || 'private_vehicle',
                    originLabel: String(request.origin?.label || request.originLabel || ''),
                    pace: request.pace || 'balanced',
                },
                budgetEstimate,
                validationNote: validation.note || '',
                widgets: couponWidgets,
                departmentCoupons: departmentCoupons.map((c) => ({
                    id: c.id,
                    isPremium: c.isPremium,
                    title: c.title,
                    discount: c.discount,
                })),
            },
        });

        console.log(`[expedition] Pipeline ready: ${expeditionId} (${itineraryDays.length} days)`);
    } catch (err) {
        console.error(`[expedition] Pipeline failed for ${expeditionId}:`, err);
        await setStatus('error', { error: String((err as Error).message || err) });
    }
}
