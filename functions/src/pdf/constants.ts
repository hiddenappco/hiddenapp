/** Placeholders replaced with bundled data URIs before Puppeteer render. */
export const PDF_LOGO_SRC = '__HIDDEN_PDF_LOGO__';
export const PDF_QR_SRC = '__HIDDEN_PDF_QR__';

export const HIDDEN_WEB_URL = 'https://hiddenapp.co';

export const PDF_CACHE_DAYS = 7;
/** Shared catalog destination PDFs — longer TTL; invalidated by content fingerprint. */
export const DESTINATION_PDF_CACHE_DAYS = 90;

/** Inner content inset — padding inside the dark full-bleed page (not white Puppeteer margins). */
export const PDF_MARGIN_MM = {
    top: '14mm',
    right: '12mm',
    bottom: '18mm',
    left: '12mm',
} as const;

/** A4 viewport for Puppeteer (96 dpi) — keeps layout width aligned with the printed page. */
export const PDF_VIEWPORT = {
    width: 794,
    height: 1123,
} as const;

/** Bump when PDF layout/template changes to invalidate cached destination PDFs. */
export const DESTINATION_PDF_TEMPLATE_VERSION = 3;
