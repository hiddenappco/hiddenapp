import { onRequest } from "firebase-functions/v2/https";
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import { db, storage } from "../config/firebase";
import { generatePdfHtml } from '../pdfTemplate';
import { v4 as uuidv4 } from 'uuid';

export const generateTripPdf = onRequest(
    { cors: true, timeoutSeconds: 120, memory: "4GiB" },
    async (req, res) => {
        let browser = null;
        try {
            console.log("[generateTripPdf] Starting PDF generation process (4GiB Tier)...");
            const { tripId, userId } = req.body;

            if (!tripId || !userId) {
                console.error("[generateTripPdf] Error: Missing tripId or userId");
                res.status(400).send('Missing tripId or userId');
                return;
            }

            console.log(`[generateTripPdf] Fetching data for Trip: ${tripId} | User: ${userId}`);
            const tripDoc = await db.collection('trips').doc(tripId).get();
            if (!tripDoc.exists) {
                console.error(`[generateTripPdf] Error: Trip ${tripId} not found`);
                res.status(404).send('Trip not found');
                return;
            }
            const trip = tripDoc.data();

            console.log("[generateTripPdf] Fetching expenses...");
            const expensesSnapshot = await db.collection('trips').doc(tripId).collection('expenses').orderBy('createdAt', 'desc').get();
            const expenses = expensesSnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    ...data,
                    date: data.date || '',
                    time: data.time || ''
                } as any;
            });

            console.log(`[generateTripPdf] Processing ${expenses.length} expenses...`);
            const totalSpent = trip?.totalSpent || expenses.reduce((acc: number, curr: any) => acc + curr.amount, 0);
            const formattedTotal = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(totalSpent);

            console.log("[generateTripPdf] Generating HTML template...");
            const html = generatePdfHtml(trip, expenses, totalSpent, formattedTotal);

            console.log("[generateTripPdf] Launching Chromium with Memory-Saving flags...");
            const executablePath = await chromium.executablePath();
            browser = await puppeteer.launch({
                args: [
                    ...chromium.args,
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                    '--disable-canvas-aa',
                    '--disable-2d-canvas-clip-aa',
                    '--single-process'
                ],
                defaultViewport: { width: 1280, height: 720 },
                executablePath: executablePath,
                headless: true,
            } as any);

            console.log("[generateTripPdf] Rendering PDF content...");
            const page = await browser.newPage();
            await page.setContent(html, { waitUntil: 'networkidle0' as any });

            const pdfUint8 = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: { top: '0', right: '0', bottom: '0', left: '0' }
            });

            console.log("[generateTripPdf] PDF generated successfully. Preparing buffer...");
            const pdfBuffer = Buffer.from(pdfUint8);

            console.log("[generateTripPdf] Uploading PDF to Firebase Storage...");
            const bucket = storage.bucket();
            const timestamp = Date.now();
            const filePath = `users/${userId}/pdfs/trip_${tripId}_${timestamp}.pdf`;
            const file = bucket.file(filePath);
            
            const token = uuidv4();
            await file.save(pdfBuffer, {
                metadata: {
                    contentType: 'application/pdf',
                    metadata: {
                        firebaseStorageDownloadTokens: token
                    }
                }
            });

            console.log("[generateTripPdf] Building Firebase Storage Download URL...");
            const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(filePath)}?alt=media&token=${token}`;
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7);

            console.log("[generateTripPdf] Updating Firestore Document...");
            await db.collection('trips').doc(tripId).update({
                pdfUrl: url,
                pdfExpiresAt: expiresAt
            });

            console.log("[generateTripPdf] PDF generation and storage complete.");
            res.status(200).json({ success: true, pdfUrl: url });

        } catch (error) {
            console.error('[generateTripPdf] CRITICAL ERROR:', error);
            res.status(500).json({ error: `Error generating PDF: ${error instanceof Error ? error.message : 'Unknown error'}` });
        } finally {
            if (browser !== null) {
                console.log("[generateTripPdf] Closing browser...");
                await browser.close();
            }
        }
    }
);
