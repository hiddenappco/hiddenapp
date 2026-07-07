import type { Trip, TripDocument } from '../types/trips';
import { canEditTrip, getMemberRole } from '../hooks/useTrips';

export function isTripMember(trip: Trip | null, uid: string | undefined): boolean {
    if (!trip || !uid) return false;
    if (trip.userId === uid || trip.ownerId === uid) return true;
    return trip.memberIds?.includes(uid) ?? false;
}

export function canUploadTripDocument(
    trip: Trip | null,
    uid: string | undefined,
    isPremium: boolean
): boolean {
    return isPremium && canEditTrip(trip, uid);
}

export function canViewTripDocuments(
    trip: Trip | null,
    uid: string | undefined,
    isPremium: boolean
): boolean {
    return isPremium && isTripMember(trip, uid);
}

export function canDeleteTripDocument(
    trip: Trip | null,
    uid: string | undefined,
    doc: TripDocument
): boolean {
    if (!trip || !uid || doc.deleted) return false;
    const role = getMemberRole(trip, uid);
    if (role === 'observer') return false;
    if (role === 'owner') return true;
    if (role === 'editor') return doc.uploadedByUid === uid;
    return false;
}

/** Renaming follows the same rule as deletion: the owner can rename any file,
 * an editor only the ones they uploaded, observers none. Mirrors firestore.rules. */
export function canRenameTripDocument(
    trip: Trip | null,
    uid: string | undefined,
    doc: TripDocument
): boolean {
    return canDeleteTripDocument(trip, uid, doc);
}

export function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
