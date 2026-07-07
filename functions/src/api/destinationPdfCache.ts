import { onRequest } from 'firebase-functions/v2/https';
import { purgeDestinationPdfCache } from '../lib/destinationPdfCachePurge';

/**
 * Purges cached destination PDFs (Storage + Firestore `pdfCache`).
 * GET `?dryRun=1` (default) — report only.
 * GET `?dryRun=0` — delete files and clear Firestore cache entries.
 */
export const purgeDestinationPdfCacheHttp = onRequest(
    { cors: true, timeoutSeconds: 300, memory: '512MiB', maxInstances: 1 },
    async (req, res) => {
        if (req.method !== 'GET' && req.method !== 'POST') {
            res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
            return;
        }

        try {
            const dryRun = req.query.dryRun !== '0';
            const report = await purgeDestinationPdfCache(dryRun);
            res.status(200).json({ success: true, ...report });
        } catch (error) {
            console.error('[purgeDestinationPdfCacheHttp]', error);
            res.status(500).json({
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
);
