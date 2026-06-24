import { onRequest } from 'firebase-functions/v2/https';
import { db } from '../config/firebase';
import { localizeDestination } from '../lib/localizeCatalog';
import { pickLocalized } from '../lib/localizedContent';
import { AuthError, requireAuthUid } from '../lib/verifyAuth';
import { generateTripPdfHtml } from '../pdf/tripTemplate';
import { generateDestinationPdfHtml } from '../pdf/destinationTemplate';
import { generateExpeditionPdfHtml } from '../pdf/expeditionTemplate';
import { renderHtmlToPdfBuffer, uploadCatalogDestinationPdf, uploadUserPdf } from '../pdf/renderPdf';
import type { PdfLanguage } from '../pdf/shared';
import { hasActivePremium } from '../lib/premiumAccess';
import {
    destinationPdfFingerprint,
    isDestinationPdfCacheValid,
} from '../lib/destinationPdfCache';
import { computeDirectCommunityFromRefugioPricing } from '../lib/directCommunity';

async function userIsPremium(uid: string): Promise<boolean> {
    const snap = await db.collection('users').doc(uid).get();
    return hasActivePremium(snap.data());
}

function normalizeLanguage(raw: unknown): PdfLanguage {
    return String(raw || 'es').toLowerCase().startsWith('en') ? 'en' : 'es';
}

async function handlePdfRequest(
    res: { status: (n: number) => { json: (o: object) => void; send: (s: string) => void } },
    html: string,
    userId: string,
    storagePath: string,
    updateDoc?: { collection: string; id: string }
): Promise<void> {
    const buffer = await renderHtmlToPdfBuffer(html);
    const { url, expiresAt } = await uploadUserPdf(userId, storagePath, buffer);
    if (updateDoc) {
        await db.collection(updateDoc.collection).doc(updateDoc.id).update({
            pdfUrl: url,
            pdfExpiresAt: expiresAt,
        });
    }
    res.status(200).json({ success: true, pdfUrl: url, pdfExpiresAt: expiresAt.toISOString() });
}

export const generateTripPdf = onRequest(
    { cors: true, timeoutSeconds: 120, memory: '4GiB' },
    async (req, res) => {
        try {
            const uid = await requireAuthUid(req);
            const { tripId, userId, language } = req.body;

            if (!tripId || !userId) {
                res.status(400).send('Missing tripId or userId');
                return;
            }

            if (userId !== uid) {
                res.status(403).json({ error: 'FORBIDDEN' });
                return;
            }

            if (!(await userIsPremium(uid))) {
                res.status(403).json({ error: 'PREMIUM_REQUIRED' });
                return;
            }

            const lang = normalizeLanguage(language);

            const tripDoc = await db.collection('trips').doc(tripId).get();
            if (!tripDoc.exists) {
                res.status(404).send('Trip not found');
                return;
            }
            const trip = tripDoc.data();

            const expensesSnapshot = await db
                .collection('trips')
                .doc(tripId)
                .collection('expenses')
                .orderBy('createdAt', 'desc')
                .get();
            const expenses = expensesSnapshot.docs.map((doc) => doc.data());
            const totalSpent =
                trip?.totalSpent || expenses.reduce((acc: number, curr) => acc + (Number(curr.amount) || 0), 0);

            const html = generateTripPdfHtml(trip || {}, expenses, totalSpent, lang);
            const timestamp = Date.now();
            await handlePdfRequest(res, html, userId, `users/${userId}/pdfs/trip_${tripId}_${timestamp}.pdf`, {
                collection: 'trips',
                id: tripId,
            });
        } catch (error) {
            if (error instanceof AuthError) {
                res.status(401).json({ error: 'MISSING_AUTHORIZATION' });
                return;
            }
            console.error('[generateTripPdf]', error);
            res.status(500).json({
                error: `Error generating PDF: ${error instanceof Error ? error.message : 'Unknown error'}`,
            });
        }
    }
);

export const generateDestinationPdf = onRequest(
    { cors: true, timeoutSeconds: 120, memory: '2GiB' },
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
            const uid = await requireAuthUid(req);
            if (!(await userIsPremium(uid))) {
                res.status(403).json({ error: 'PREMIUM_REQUIRED' });
                return;
            }

            const { destinationId, language: rawLang } = req.body as {
                destinationId?: string;
                language?: string;
            };
            if (!destinationId) {
                res.status(400).json({ error: 'MISSING_DESTINATION_ID' });
                return;
            }

            const lang = normalizeLanguage(rawLang);
            const destDoc = await db.collection('destinations').doc(destinationId).get();
            if (!destDoc.exists) {
                res.status(404).json({ error: 'DESTINATION_NOT_FOUND' });
                return;
            }

            const raw = { id: destDoc.id, ...destDoc.data() } as Record<string, unknown>;
            const cached = isDestinationPdfCacheValid(raw, lang);
            if (cached) {
                res.status(200).json({
                    success: true,
                    pdfUrl: cached.url,
                    pdfExpiresAt: cached.expiresAt.toISOString(),
                    cached: true,
                });
                return;
            }

            const localized = localizeDestination(raw, lang);
            const heroImage = String(raw.heroImage || raw.image || '').trim();
            if (heroImage) localized.heroImage = heroImage;

            let departmentName = String(raw.departmentId || '');
            const deptId = String(raw.departmentId || '');
            if (deptId) {
                const deptSnap = await db
                    .collection('departments')
                    .where('departmentId', '==', deptId)
                    .limit(1)
                    .get();
                const deptDoc = deptSnap.docs[0] ?? (await db.collection('departments').doc(deptId).get());
                if (deptDoc?.exists) {
                    const deptData = deptDoc.data() as Record<string, unknown>;
                    departmentName =
                        pickLocalized(deptData, 'name', lang) || String(deptData.name || departmentName);
                }
            }

            const html = generateDestinationPdfHtml(localized, departmentName, lang);
            const buffer = await renderHtmlToPdfBuffer(html);
            const { url, expiresAt } = await uploadCatalogDestinationPdf(destinationId, lang, buffer);
            const fingerprint = destinationPdfFingerprint(raw, lang);

            await db.collection('destinations').doc(destinationId).update({
                [`pdfCache.${lang}`]: {
                    url,
                    expiresAt,
                    fingerprint,
                },
            });

            res.status(200).json({
                success: true,
                pdfUrl: url,
                pdfExpiresAt: expiresAt.toISOString(),
                cached: false,
            });
        } catch (error) {
            if (error instanceof AuthError) {
                res.status(401).json({ error: 'MISSING_AUTHORIZATION' });
                return;
            }
            console.error('[generateDestinationPdf]', error);
            res.status(500).json({
                error: `Error generating PDF: ${error instanceof Error ? error.message : 'Unknown error'}`,
            });
        }
    }
);

function readExpeditionGroundMobility(data: Record<string, unknown>): string | undefined {
    const itinerary = data.itinerary as Record<string, unknown> | undefined;
    const travelContext = itinerary?.travelContext as Record<string, unknown> | undefined;
    const request = data.request as Record<string, unknown> | undefined;
    const raw = travelContext?.groundMobility ?? request?.groundMobility;
    return raw ? String(raw) : undefined;
}

async function enrichItineraryRefugioEsg(
    itinerary: Record<string, unknown>
): Promise<Record<string, unknown>> {
    const days = Array.isArray(itinerary.days) ? ([...itinerary.days] as Record<string, unknown>[]) : [];
    const refugioIds = new Set<string>();
    for (const day of days) {
        const refugio = day.refugio as Record<string, unknown> | null | undefined;
        if (refugio?.id) refugioIds.add(String(refugio.id));
    }
    if (refugioIds.size === 0) return itinerary;

    const esgById = new Map<string, Record<string, unknown>>();
    await Promise.all(
        [...refugioIds].map(async (id) => {
            const snap = await db.collection('refugios').doc(id).get();
            if (!snap.exists) return;
            const amount = computeDirectCommunityFromRefugioPricing(snap.data()?.pricingGuide);
            if (amount) esgById.set(id, amount as unknown as Record<string, unknown>);
        })
    );

    if (esgById.size === 0) return itinerary;

    const enrichedDays = days.map((day) => {
        const refugio = day.refugio as Record<string, unknown> | null | undefined;
        if (!refugio?.id) return day;
        const directCommunity = esgById.get(String(refugio.id));
        if (!directCommunity) return day;
        return {
            ...day,
            refugio: { ...refugio, directCommunity },
        };
    });

    return { ...itinerary, days: enrichedDays };
}

export const generateExpeditionPdf = onRequest(
    { cors: true, timeoutSeconds: 120, memory: '4GiB' },
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
            const uid = await requireAuthUid(req);
            if (!(await userIsPremium(uid))) {
                res.status(403).json({ error: 'PREMIUM_REQUIRED' });
                return;
            }

            const { expeditionId } = req.body as { expeditionId?: string };
            if (!expeditionId) {
                res.status(400).json({ error: 'MISSING_EXPEDITION_ID' });
                return;
            }

            const expDoc = await db.collection('expeditions').doc(expeditionId).get();
            if (!expDoc.exists) {
                res.status(404).json({ error: 'EXPEDITION_NOT_FOUND' });
                return;
            }

            const data = expDoc.data()!;
            if (data.userId !== uid) {
                res.status(403).json({ error: 'FORBIDDEN' });
                return;
            }
            if (data.status !== 'ready' || !data.itinerary) {
                res.status(400).json({ error: 'EXPEDITION_NOT_READY' });
                return;
            }

            const lang = normalizeLanguage(data.language);
            const departmentId = String(data.departmentId || '');
            let departmentName = departmentId;
            if (departmentId) {
                const deptSnap = await db
                    .collection('departments')
                    .where('departmentId', '==', departmentId)
                    .limit(1)
                    .get();
                const deptDoc = deptSnap.docs[0];
                if (deptDoc?.exists) {
                    const deptData = deptDoc.data() as Record<string, unknown>;
                    departmentName =
                        pickLocalized(deptData, 'name', lang) || String(deptData.name || departmentName);
                }
            }

            const enrichedItinerary = await enrichItineraryRefugioEsg(
                data.itinerary as Record<string, unknown>
            );

            const html = generateExpeditionPdfHtml(enrichedItinerary, {
                departmentName,
                days: Number(data.request?.days) || (data.itinerary as { days?: unknown[] }).days?.length || 0,
                language: lang,
                groundMobility: readExpeditionGroundMobility(data as Record<string, unknown>),
            });

            const timestamp = Date.now();
            await handlePdfRequest(
                res,
                html,
                uid,
                `users/${uid}/pdfs/expedition_${expeditionId}_${timestamp}.pdf`,
                { collection: 'expeditions', id: expeditionId }
            );
        } catch (error) {
            if (error instanceof AuthError) {
                res.status(401).json({ error: 'MISSING_AUTHORIZATION' });
                return;
            }
            console.error('[generateExpeditionPdf]', error);
            res.status(500).json({
                error: `Error generating PDF: ${error instanceof Error ? error.message : 'Unknown error'}`,
            });
        }
    }
);
