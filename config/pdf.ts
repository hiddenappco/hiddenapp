/** Typical A4 bilingual destination dossier size (server-generated). */
export const DESTINATION_PDF_ESTIMATED_MB = 2.1;

/** Keep in sync with functions/src/pdf/constants.ts DESTINATION_PDF_TEMPLATE_VERSION */
export const DESTINATION_PDF_TEMPLATE_VERSION = 3;

export function formatPdfSizeMb(bytes?: number | null): string {
    if (bytes != null && Number.isFinite(bytes) && bytes > 0) {
        const mb = bytes / (1024 * 1024);
        return mb >= 0.1 ? mb.toFixed(1) : '<0.1';
    }
    return String(DESTINATION_PDF_ESTIMATED_MB);
}
