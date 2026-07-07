import { createHash } from 'crypto';
import type { AppLanguage } from './localizedContent';
import { localizeDestination } from './localizeCatalog';
import { normalizeDestinationCoordinates, normalizeDestinationStats } from './destinationFields';
import { DESTINATION_PDF_TEMPLATE_VERSION } from '../pdf/constants';

type RawDoc = Record<string, unknown>;

export interface DestinationPdfCacheEntry {
    url: string;
    expiresAt: Date;
    fingerprint: string;
}

/** Stable hash of PDF-relevant localized fields — invalidates cache when editorial content changes. */
export function destinationPdfFingerprint(raw: RawDoc, lang: AppLanguage): string {
    const localized = localizeDestination(raw, lang);
    const payload = {
        pdfTemplateVersion: DESTINATION_PDF_TEMPLATE_VERSION,
        title: localized.title,
        location: localized.location,
        description: localized.description,
        aiTip: localized.aiTip,
        activities: localized.activities,
        gettingThere: localized.gettingThere,
        pricingGuide: localized.pricingGuide,
        packingSummary: localized.packingSummary,
        packingGuide: localized.packingGuide,
        planningNotes: localized.planningNotes,
        stats: normalizeDestinationStats(raw),
        coordinates: normalizeDestinationCoordinates(raw),
        status: raw.status,
    };
    return createHash('sha256').update(JSON.stringify(payload)).digest('hex').slice(0, 20);
}

export function readDestinationPdfCache(
    raw: RawDoc,
    lang: AppLanguage
): { url?: string; expiresAt?: unknown; fingerprint?: string } | undefined {
    const cache = raw.pdfCache as Record<string, unknown> | undefined;
    const entry = cache?.[lang] as Record<string, unknown> | undefined;
    return entry;
}

export function isDestinationPdfCacheValid(
    raw: RawDoc,
    lang: AppLanguage
): DestinationPdfCacheEntry | null {
    const entry = readDestinationPdfCache(raw, lang);
    if (!entry?.url || !entry.fingerprint) return null;

    const expected = destinationPdfFingerprint(raw, lang);
    if (entry.fingerprint !== expected) return null;

    const expiresAt =
        entry.expiresAt &&
        typeof entry.expiresAt === 'object' &&
        entry.expiresAt !== null &&
        'toDate' in (entry.expiresAt as { toDate?: () => Date }) &&
        typeof (entry.expiresAt as { toDate: () => Date }).toDate === 'function'
            ? (entry.expiresAt as { toDate: () => Date }).toDate()
            : new Date(String(entry.expiresAt));

    if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) return null;

    return {
        url: String(entry.url),
        expiresAt,
        fingerprint: String(entry.fingerprint),
    };
}
