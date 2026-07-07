import fs from 'fs';
import path from 'path';
import { PDF_LOGO_SRC, PDF_QR_SRC } from './constants';

const ASSETS_DIR = path.join(__dirname, 'assets');

function loadAssetDataUri(filename: string): string {
    const filePath = path.join(ASSETS_DIR, filename);
    const buf = fs.readFileSync(filePath);
    if (buf.length === 0) {
        throw new Error(`PDF asset is empty: ${filename}`);
    }
    const ext = path.extname(filename).toLowerCase();
    const mime = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
    return `data:${mime};base64,${buf.toString('base64')}`;
}

let cachedLogo: string | null = null;
let cachedQr: string | null = null;

function logoDataUri(): string {
    if (!cachedLogo) cachedLogo = loadAssetDataUri('hidden-logo.png');
    return cachedLogo;
}

function qrDataUri(): string {
    if (!cachedQr) cachedQr = loadAssetDataUri('hidden-qr.png');
    return cachedQr;
}

/** Replaces logo/QR placeholders with bundled data URIs — no network during Chromium paint. */
export function inlinePdfStaticAssets(html: string): string {
    const logo = logoDataUri();
    const qr = qrDataUri();
    return html.split(PDF_LOGO_SRC).join(logo).split(PDF_QR_SRC).join(qr);
}
