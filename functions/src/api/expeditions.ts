import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { onRequest } from 'firebase-functions/v2/https';
import { db, admin } from '../config/firebase';
import { resolveDepartmentContext } from '../lib/departmentProfile';
import { AuthError, requireAuthUid } from '../lib/verifyAuth';
import { runExpeditionPipeline } from '../adk/expedition/run';
import type { ExpeditionRequest, GroundMobility } from '../adk/expedition/types';
import { GROUND_MOBILITY_VALUES } from '../adk/expedition/types';
import { normalizeAppLanguage } from '../adk/chat/briefing';
import { hasActivePremium } from '../lib/premiumAccess';
import { assertExpeditionQuota, consumeExpeditionQuota } from '../lib/expeditionQuota';
import { MAX_EXPEDITION_DAYS, MAX_REVISION_NOTES_LENGTH } from '../lib/premiumLimits';

const MAX_DAYS = MAX_EXPEDITION_DAYS;

function validateRequestBody(body: Record<string, unknown>): {
    departmentId: string;
    language: 'es' | 'en';
    request: ExpeditionRequest;
    parentExpeditionId?: string;
    revisionNotes?: string;
} {
    const departmentId = String(body.departmentId || '').trim();
    if (!departmentId) throw new Error('MISSING_DEPARTMENT');

    const language = normalizeAppLanguage(String(body.language || 'es'));
    const raw = (body.request as Record<string, unknown>) || body;

    const days = Number(raw.days);
    if (!Number.isFinite(days) || days < 1 || days > MAX_DAYS) {
        throw new Error('INVALID_DAYS');
    }

    const origin = (raw.origin as Record<string, unknown>) || {
        label: raw.originLabel || '',
        lat: raw.originLat ?? null,
        lng: raw.originLng ?? null,
    };

    const label = String(origin.label || '').trim();
    if (!label && (origin.lat == null || origin.lng == null)) {
        throw new Error('MISSING_ORIGIN');
    }

    const interests = Array.isArray(raw.interests) ? raw.interests.map(String).filter(Boolean) : [];
    if (interests.length === 0) throw new Error('MISSING_INTERESTS');

    const budgetMode = String(raw.budgetMode || 'open') as ExpeditionRequest['budgetMode'];
    const budget = (raw.budget as ExpeditionRequest['budget']) || {};
    if (budgetMode === 'fixed' && !budget.amountCOP) throw new Error('MISSING_BUDGET_AMOUNT');
    if (budgetMode === 'range' && (budget.minCOP == null || budget.maxCOP == null)) {
        throw new Error('MISSING_BUDGET_RANGE');
    }

    const rawMobility = String(raw.groundMobility || 'private_vehicle') as GroundMobility;
    const groundMobility: GroundMobility = GROUND_MOBILITY_VALUES.includes(rawMobility)
        ? rawMobility
        : 'private_vehicle';

    const request: ExpeditionRequest = {
        days,
        origin: {
            label: label || 'GPS',
            lat: typeof origin.lat === 'number' ? origin.lat : null,
            lng: typeof origin.lng === 'number' ? origin.lng : null,
        },
        travelDates: raw.travelDates as ExpeditionRequest['travelDates'],
        pace: (raw.pace as ExpeditionRequest['pace']) || 'balanced',
        budgetMode,
        budget,
        interests,
        travelerProfile: (raw.travelerProfile as ExpeditionRequest['travelerProfile']) || 'solo',
        groupSize: raw.groupSize != null ? Number(raw.groupSize) : undefined,
        mustVisitDestinationIds: Array.isArray(raw.mustVisitDestinationIds)
            ? raw.mustVisitDestinationIds.map(String)
            : [],
        avoidDestinationIds: Array.isArray(raw.avoidDestinationIds)
            ? raw.avoidDestinationIds.map(String)
            : [],
        destinationTypeFilter: Array.isArray(raw.destinationTypeFilter)
            ? raw.destinationTypeFilter.map(String)
            : [],
        accommodationPreference: raw.accommodationPreference as ExpeditionRequest['accommodationPreference'],
        groundMobility,
        transportConstraints: Array.isArray(raw.transportConstraints)
            ? raw.transportConstraints.map(String)
            : [],
        maxStopsPerDay: raw.maxStopsPerDay != null ? Number(raw.maxStopsPerDay) : undefined,
        accessibilityNotes: raw.accessibilityNotes ? String(raw.accessibilityNotes) : undefined,
        travelerNotes: raw.travelerNotes ? String(raw.travelerNotes).trim().slice(0, 1200) : undefined,
    };

    const parentExpeditionId = body.parentExpeditionId
        ? String(body.parentExpeditionId).trim()
        : undefined;
    const revisionNotes = body.revisionNotes
        ? String(body.revisionNotes).trim().slice(0, MAX_REVISION_NOTES_LENGTH)
        : undefined;

    if (parentExpeditionId && !revisionNotes) {
        throw new Error('MISSING_REVISION_NOTES');
    }

    return { departmentId, language, request, parentExpeditionId, revisionNotes };
}

/**
 * Authenticated HTTP entry for the expedition planner hub.
 * Enqueues expeditions/{id}; onExpeditionCreate runs the multi-agent pipeline.
 */
export const createExpedition = onRequest(
    {
        cors: true,
        timeoutSeconds: 30,
        memory: '256MiB',
    },
    async (req, res) => {
        res.set('Access-Control-Allow-Origin', '*');
        if (req.method === 'OPTIONS') {
            res.set('Access-Control-Allow-Methods', 'POST');
            res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            res.status(204).send('');
            return;
        }
        if (req.method !== 'POST') {
            res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
            return;
        }

        try {
            const userId = await requireAuthUid(req);
            const userSnap = await db.collection('users').doc(userId).get();
            const userData = userSnap.data() ?? {};

            if (!hasActivePremium(userData)) {
                res.status(403).json({ error: 'PREMIUM_REQUIRED' });
                return;
            }

            const parsed = validateRequestBody(req.body as Record<string, unknown>);
            const { canonicalId } = await resolveDepartmentContext(db, parsed.departmentId);

            let requestPayload = parsed.request;
            let parentExpeditionId: string | undefined;
            let revisionIncluded = false;

            if (parsed.parentExpeditionId) {
                const parentRef = db.collection('expeditions').doc(parsed.parentExpeditionId);
                const parentSnap = await parentRef.get();
                if (!parentSnap.exists) {
                    res.status(404).json({ error: 'PARENT_EXPEDITION_NOT_FOUND' });
                    return;
                }

                const parent = parentSnap.data()!;
                if (parent.userId !== userId) {
                    res.status(403).json({ error: 'FORBIDDEN' });
                    return;
                }
                if (parent.status !== 'ready' || !parent.request) {
                    res.status(400).json({ error: 'PARENT_EXPEDITION_NOT_READY' });
                    return;
                }

                const revisionsUsed = Math.max(0, Math.floor(Number(parent.revisionsUsed ?? 0)));
                revisionIncluded = revisionsUsed === 0;

                if (!revisionIncluded) {
                    const quota = await assertExpeditionQuota(db, userId);
                    if (!quota.allowed) {
                        res.status(403).json({
                            error: quota.reason ?? 'EXPEDITION_QUOTA_EXCEEDED',
                            remaining: quota.remaining,
                            limit: quota.limit,
                            resetAt: quota.resetAt,
                        });
                        return;
                    }
                    await consumeExpeditionQuota(db, userId);
                }

                const parentRequest = parent.request as ExpeditionRequest;
                const priorNotes = String(parentRequest.travelerNotes || '').trim();
                const revisionBlock = `[REVISION_REQUEST]\n${parsed.revisionNotes}`;
                const mergedNotes = priorNotes ? `${priorNotes}\n\n${revisionBlock}` : revisionBlock;

                requestPayload = {
                    ...parentRequest,
                    ...parsed.request,
                    days: parsed.request.days || parentRequest.days,
                    travelerNotes: mergedNotes,
                };

                parentExpeditionId = parsed.parentExpeditionId;
                await parentRef.update({
                    revisionsUsed: revisionsUsed + 1,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            } else {
                const quota = await assertExpeditionQuota(db, userId);
                if (!quota.allowed) {
                    res.status(403).json({
                        error: quota.reason ?? 'EXPEDITION_QUOTA_EXCEEDED',
                        remaining: quota.remaining,
                        limit: quota.limit,
                        resetAt: quota.resetAt,
                    });
                    return;
                }
                await consumeExpeditionQuota(db, userId);
            }

            const mustVisit = requestPayload.mustVisitDestinationIds ?? [];
            if (mustVisit.length > 0) {
                const uniqueIds = [...new Set(mustVisit)];
                const refs = uniqueIds.map((id) => db.collection('destinations').doc(id));
                const snaps = await db.getAll(...refs);
                const existing = new Set(snaps.filter((s) => s.exists).map((s) => s.id));
                for (const id of uniqueIds) {
                    if (!existing.has(id)) {
                        res.status(400).json({ error: 'INVALID_MUST_VISIT', destinationId: id });
                        return;
                    }
                }
            }

            const docRef = await db.collection('expeditions').add({
                userId,
                departmentId: canonicalId,
                language: parsed.language,
                request: requestPayload,
                status: 'queued',
                parentExpeditionId: parentExpeditionId ?? null,
                revisionNotes: parsed.revisionNotes ?? null,
                revisionIncluded,
                // Solo el plan original incluye 1 ajuste gratis. Un plan generado por
                // revisión nace "con su ajuste ya usado" para no encadenar revisiones gratis.
                revisionsUsed: parentExpeditionId ? 1 : 0,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            console.log(
                `[createExpedition] ${docRef.id} | ${canonicalId} | ${requestPayload.days} days` +
                    (parentExpeditionId ? ` | revision of ${parentExpeditionId}` : '')
            );

            res.status(200).json({ expeditionId: docRef.id, status: 'queued' });
        } catch (err) {
            if (err instanceof AuthError) {
                res.status(401).json({ error: 'MISSING_AUTHORIZATION' });
                return;
            }
            const msg = String((err as Error).message || err);
            console.error('[createExpedition]', msg);
            if (msg === 'EXPEDITION_QUOTA_EXCEEDED' || msg === 'PREMIUM_REQUIRED') {
                res.status(403).json({ error: msg });
                return;
            }
            res.status(400).json({ error: msg });
        }
    }
);

/**
 * Background pipeline trigger when a new expedition is queued.
 */
export const onExpeditionCreate = onDocumentCreated(
    {
        document: 'expeditions/{expeditionId}',
        timeoutSeconds: 540,
        memory: '2GiB',
        secrets: ['GEMINI_API_KEY', 'GOOGLE_MAPS_API_KEY'],
    },
    async (event) => {
        const data = event.data?.data();
        if (!data || data.status !== 'queued') return;
        await runExpeditionPipeline(event.params.expeditionId);
    }
);
