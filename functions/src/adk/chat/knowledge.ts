import type { Firestore } from 'firebase-admin/firestore';
import { db } from '../../config/firebase';
import { expandDepartmentKbIds, fetchDepartmentProfile } from '../../lib/departmentProfile';
import { mapDestinationForAgent } from '../../lib/geo';
import {
    localizeCatalogDocument,
    DESTINATION_SEARCH_FIELDS,
} from '../../lib/localizeCatalog';
import { matchesLocalizedSearch, type AppLanguage } from '../../lib/localizedContent';

export interface CatalogScope {
    departmentId: string;
    kbIds?: string[];
    appLanguage?: AppLanguage;
}

function resolveLang(scope: CatalogScope): AppLanguage {
    return scope.appLanguage === 'en' ? 'en' : 'es';
}

export function resolveKbIds(departmentId: string, kbIds?: string[]): string[] {
    const base = kbIds?.length ? kbIds : expandDepartmentKbIds(departmentId);
    return [...new Set(base)];
}

/**
 * Removes media/binary fields before injecting catalog rows into the model context.
 * Image URLs and PDF paths burn tokens without informing the answer; the frontend
 * renders widget cards from Firestore by id, so visuals are never sourced from here.
 * Never strips coordinates (required by checkRouteStatus).
 */
const HEAVY_MEDIA_FIELDS = [
    'gallery',
    'galleryImages',
    'images',
    'heroImage',
    'image',
    'authorAvatar',
    'pdfFile',
] as const;

function stripHeavyMediaFields(data: Record<string, unknown>): Record<string, unknown> {
    const copy = { ...data };
    for (const field of HEAVY_MEDIA_FIELDS) {
        delete copy[field];
    }
    return copy;
}

function localizeRow(
    collection: Parameters<typeof localizeCatalogDocument>[0],
    row: Record<string, unknown>,
    lang: AppLanguage
): Record<string, unknown> {
    return localizeCatalogDocument(collection, row, lang);
}

export async function getDepartmentKnowledge(
    scope: CatalogScope,
    firestore: Firestore = db
): Promise<Record<string, unknown> | null> {
    const kbIds = resolveKbIds(scope.departmentId, scope.kbIds);
    const profile = await fetchDepartmentProfile(firestore, kbIds[0] || scope.departmentId);
    if (!profile) return null;
    return localizeRow('departments', profile, resolveLang(scope));
}

export async function getDestinationsKnowledge(
    scope: CatalogScope,
    opts?: { searchQuery?: string; limit?: number },
    firestore: Firestore = db
): Promise<Array<Record<string, unknown>>> {
    const lang = resolveLang(scope);
    const kbIds = resolveKbIds(scope.departmentId, scope.kbIds);
    const limit = Math.min(opts?.limit ?? 40, 80);
    const snap = await firestore
        .collection('destinations')
        .where('departmentId', 'in', kbIds)
        .limit(500)
        .get();

    let rows = snap.docs.map((doc) => {
        const raw = mapDestinationForAgent(doc.id, doc.data() as Record<string, unknown>);
        return localizeRow('destinations', stripHeavyMediaFields(raw), lang);
    });

    if (opts?.searchQuery?.trim()) {
        rows = rows.filter((r) =>
            matchesLocalizedSearch(r, opts.searchQuery!.trim(), [...DESTINATION_SEARCH_FIELDS])
        );
    }

    return rows.slice(0, limit);
}

export async function getRefugiosKnowledge(
    scope: CatalogScope,
    opts?: { destinationId?: string; limit?: number },
    firestore: Firestore = db
): Promise<Array<Record<string, unknown>>> {
    const lang = resolveLang(scope);
    const kbIds = resolveKbIds(scope.departmentId, scope.kbIds);
    const limit = Math.min(opts?.limit ?? 30, 60);
    const snap = await firestore
        .collection('refugios')
        .where('departmentId', 'in', kbIds)
        .limit(500)
        .get();

    const normalizeText = (s: string) =>
        s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    let rows: Array<Record<string, unknown>> = snap.docs.map((doc) => {
        const raw = { id: doc.id, ...(doc.data() as Record<string, unknown>) };
        return localizeRow('refugios', stripHeavyMediaFields(raw), lang);
    });
    rows = rows.filter((r) => r.status === 'Activo' || r.status === true);

    if (opts?.destinationId?.trim()) {
        const destId = normalizeText(opts.destinationId.trim());
        rows = rows.filter((r) => {
            const links = r.destinationId;
            if (!Array.isArray(links)) return false;
            return links.some((id) => {
                const s = normalizeText(String(id));
                return s === destId || s.includes(destId) || destId.includes(s);
            });
        });
    }

    return rows.slice(0, limit);
}

export async function getCouponsKnowledge(
    scope: CatalogScope,
    opts?: { limit?: number },
    firestore: Firestore = db
): Promise<Array<Record<string, unknown>>> {
    const lang = resolveLang(scope);
    const kbIds = resolveKbIds(scope.departmentId, scope.kbIds);
    const limit = Math.min(opts?.limit ?? 30, 60);
    const snap = await firestore
        .collection('Coupons')
        .where('departmentId', 'in', kbIds)
        .limit(500)
        .get();
    return snap.docs
        .map((doc) => {
            const raw = { id: doc.id, ...(doc.data() as Record<string, unknown>) };
            return localizeRow('Coupons', stripHeavyMediaFields(raw), lang);
        })
        .slice(0, limit);
}

export async function getEventsKnowledge(
    scope: CatalogScope,
    opts?: { limit?: number },
    firestore: Firestore = db
): Promise<Array<Record<string, unknown>>> {
    const lang = resolveLang(scope);
    const kbIds = resolveKbIds(scope.departmentId, scope.kbIds);
    const limit = Math.min(opts?.limit ?? 30, 60);
    const snap = await firestore
        .collection('Events')
        .where('departmentId', 'in', kbIds)
        .limit(500)
        .get();
    return snap.docs
        .map((doc) => {
            const raw = { id: doc.id, ...(doc.data() as Record<string, unknown>) };
            return localizeRow('Events', stripHeavyMediaFields(raw), lang);
        })
        .slice(0, limit);
}

export async function getNewsKnowledge(
    scope: CatalogScope,
    opts?: { limit?: number },
    firestore: Firestore = db
): Promise<Array<Record<string, unknown>>> {
    const lang = resolveLang(scope);
    const kbIds = resolveKbIds(scope.departmentId, scope.kbIds);
    const limit = Math.min(opts?.limit ?? 20, 40);
    const snap = await firestore
        .collection('News')
        .where('departmentId', 'in', kbIds)
        .limit(500)
        .get();
    return snap.docs
        .map((doc) => {
            const raw = { id: doc.id, ...(doc.data() as Record<string, unknown>) };
            return localizeRow('News', stripHeavyMediaFields(raw), lang);
        })
        .slice(0, limit);
}
