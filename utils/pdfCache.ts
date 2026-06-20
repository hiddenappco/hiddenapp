export type PdfExpiryValue = { toDate?: () => Date } | string | Date | undefined;

export function isPdfStillValid(pdfUrl?: string, pdfExpiresAt?: PdfExpiryValue): boolean {
    if (!pdfUrl || !pdfExpiresAt) return false;
    const expiresAt =
        typeof pdfExpiresAt === 'object' && pdfExpiresAt !== null && 'toDate' in pdfExpiresAt
            ? pdfExpiresAt.toDate!()
            : new Date(pdfExpiresAt as string | Date);
    return !Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() > Date.now();
}

export interface DestinationPdfCacheLangEntry {
    url?: string;
    expiresAt?: PdfExpiryValue;
    fingerprint?: string;
}

export type DestinationPdfCache = {
    es?: DestinationPdfCacheLangEntry;
    en?: DestinationPdfCacheLangEntry;
};

export function readDestinationPdfCacheUrl(
    pdfCache: DestinationPdfCache | undefined,
    lang: 'es' | 'en'
): string | undefined {
    const entry = pdfCache?.[lang];
    if (!entry?.url || !isPdfStillValid(entry.url, entry.expiresAt)) return undefined;
    return entry.url;
}
