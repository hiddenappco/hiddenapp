import { FieldValue } from 'firebase-admin/firestore';
import { db, storage } from '../config/firebase';

const STORAGE_PREFIX = 'catalog/pdfs/destinations/';

export interface DestinationPdfCachePurgeReport {
    dryRun: boolean;
    storageFilesFound: number;
    storageFilesDeleted: number;
    destinationsScanned: number;
    destinationsWithCache: number;
    destinationsCleared: number;
}

export async function purgeDestinationPdfCache(dryRun: boolean): Promise<DestinationPdfCachePurgeReport> {
    const report: DestinationPdfCachePurgeReport = {
        dryRun,
        storageFilesFound: 0,
        storageFilesDeleted: 0,
        destinationsScanned: 0,
        destinationsWithCache: 0,
        destinationsCleared: 0,
    };

    const bucket = storage.bucket();
    const [files] = await bucket.getFiles({ prefix: STORAGE_PREFIX });
    report.storageFilesFound = files.length;

    if (!dryRun) {
        await Promise.all(
            files.map(async (file) => {
                await file.delete({ ignoreNotFound: true });
                report.storageFilesDeleted += 1;
            })
        );
    }

    const snap = await db.collection('destinations').get();
    report.destinationsScanned = snap.size;

    let batch = db.batch();
    let batchCount = 0;

    const commitBatch = async () => {
        if (batchCount > 0) {
            await batch.commit();
            batch = db.batch();
            batchCount = 0;
        }
    };

    for (const docSnap of snap.docs) {
        const data = docSnap.data() as Record<string, unknown>;
        if (!data.pdfCache) continue;

        report.destinationsWithCache += 1;
        if (dryRun) continue;

        batch.update(docSnap.ref, { pdfCache: FieldValue.delete() });
        batchCount += 1;
        report.destinationsCleared += 1;

        if (batchCount >= 400) {
            await commitBatch();
        }
    }

    if (!dryRun) {
        await commitBatch();
    }

    return report;
}
