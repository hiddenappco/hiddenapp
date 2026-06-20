/** Public assets used by Puppeteer when rendering PDFs (must be reachable over HTTPS). */
export const HIDDEN_WEB_URL = 'https://hiddenapp.co';
export const HIDDEN_LOGO_URL = 'https://i.imgur.com/WtlATYR.png';
export const HIDDEN_QR_URL = 'https://i.imgur.com/a5vwrIi.png';

export const PDF_CACHE_DAYS = 7;
/** Shared catalog destination PDFs — longer TTL; invalidated by content fingerprint. */
export const DESTINATION_PDF_CACHE_DAYS = 90;

/** Inner content padding — applied in CSS; Puppeteer page margins stay at 0 so the dark background fills the sheet. */
export const PDF_MARGIN_MM = {
    top: '14mm',
    right: '12mm',
    bottom: '16mm',
    left: '12mm',
} as const;

/** A4 viewport for Puppeteer (96 dpi) — keeps layout width aligned with the printed page. */
export const PDF_VIEWPORT = {
    width: 794,
    height: 1123,
} as const;
