import { TRIP_DOCUMENT_LIMITS } from '../config/constants';
import { deleteTripDocumentsForTrip } from './tripDocumentFileStore';
import {
    cacheDocumentsMirror,
    getDocumentsMirror,
    listAllTripsMirror,
} from './tripLedgerStore';
import { isLocalCacheExpiredForCompletedTrip, tripFinishedAtMs } from './tripDocumentService';

/** Drops local binary copies after the post-completion grace window. */
export async function purgeExpiredTripDocumentLocalCaches(): Promise<void> {
    const trips = await listAllTripsMirror();
    for (const trip of trips) {
        if (trip.status !== 'completed') continue;
        const finished = tripFinishedAtMs(trip);
        if (!isLocalCacheExpiredForCompletedTrip(finished)) continue;

        const docs = await getDocumentsMirror(trip.id);
        const hasLocal = docs.some((d) => d.localPath);
        if (!hasLocal) continue;

        await deleteTripDocumentsForTrip(trip.id);
        const stripped = docs.map((d) => ({
            ...d,
            localPath: undefined,
        }));
        await cacheDocumentsMirror(trip.id, stripped);
    }
}

export function localCacheGraceMs(): number {
    return TRIP_DOCUMENT_LIMITS.LOCAL_CACHE_GRACE_DAYS * 24 * 60 * 60 * 1000;
}
