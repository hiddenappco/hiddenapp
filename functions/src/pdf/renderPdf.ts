import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import { v4 as uuidv4 } from 'uuid';
import { storage } from '../config/firebase';
import { DESTINATION_PDF_CACHE_DAYS, PDF_CACHE_DAYS, PDF_VIEWPORT } from './constants';
import { inlinePdfStaticAssets } from './inlineAssets';

export async function renderHtmlToPdfBuffer(html: string): Promise<Buffer> {
    let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;
    let page: Awaited<ReturnType<Awaited<ReturnType<typeof puppeteer.launch>>['newPage']>> | null = null;
    try {
        chromium.setGraphicsMode = false;
        const executablePath = await chromium.executablePath();
        browser = await puppeteer.launch({
            args: [
                ...chromium.args,
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--disable-software-rasterizer',
                '--disable-extensions',
                '--single-process',
            ],
            defaultViewport: PDF_VIEWPORT,
            executablePath,
            headless: true,
        } as Parameters<typeof puppeteer.launch>[0]);

        page = await browser.newPage();
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            const type = req.resourceType();
            const url = req.url();
            if (type === 'document' || url.startsWith('data:')) {
                req.continue();
                return;
            }
            // All styles/scripts are inline; block any stray network fetch (fonts, maps, etc.).
            req.abort();
        });

        const inlinedHtml = inlinePdfStaticAssets(html);
        await page.emulateMediaType('print');
        await page.setContent(inlinedHtml, { waitUntil: 'domcontentloaded', timeout: 30_000 });
        const pdfUint8 = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '0', right: '0', bottom: '0', left: '0' },
        });
        await page.close();
        page = null;
        return Buffer.from(pdfUint8);
    } finally {
        if (page) await page.close().catch(() => undefined);
        if (browser) await browser.close();
    }
}

export async function uploadPdf(
    storagePath: string,
    buffer: Buffer,
    cacheDays: number = PDF_CACHE_DAYS
): Promise<{ url: string; expiresAt: Date }> {
    const bucket = storage.bucket();
    const file = bucket.file(storagePath);
    const token = uuidv4();

    await file.save(buffer, {
        metadata: {
            contentType: 'application/pdf',
            metadata: { firebaseStorageDownloadTokens: token },
        },
    });

    const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(storagePath)}?alt=media&token=${token}`;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + cacheDays);
    return { url, expiresAt };
}

export async function uploadUserPdf(
    _userId: string,
    storagePath: string,
    buffer: Buffer
): Promise<{ url: string; expiresAt: Date }> {
    return uploadPdf(storagePath, buffer, PDF_CACHE_DAYS);
}

export async function uploadCatalogDestinationPdf(
    destinationId: string,
    lang: string,
    buffer: Buffer
): Promise<{ url: string; expiresAt: Date }> {
    return uploadPdf(`catalog/pdfs/destinations/${destinationId}_${lang}.pdf`, buffer, DESTINATION_PDF_CACHE_DAYS);
}
