import {
    collection,
    doc,
    getDoc,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    setDoc,
    updateDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { uploadFile } from './storageService';
import { TRIP_DOCUMENT_LIMITS } from '../config/constants';
import type { TripActivityActor, TripDocument } from '../types/trips';
import { logTripActivity } from '../hooks/useTrips';
import {
    buildTripDocumentLocalPath,
    saveTripDocumentLocal,
} from './tripDocumentFileStore';

export const TRIP_DOCUMENT_QUOTA_EXCEEDED = 'TRIP_DOCUMENT_QUOTA_EXCEEDED';
export const TRIP_DOCUMENT_FILE_TOO_LARGE = 'TRIP_DOCUMENT_FILE_TOO_LARGE';
export const TRIP_DOCUMENT_TYPE_NOT_ALLOWED = 'TRIP_DOCUMENT_TYPE_NOT_ALLOWED';

function sanitizeFileName(name: string): string {
    return name.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 120) || 'document';
}

export function buildTripDocumentStoragePath(
    uploaderUid: string,
    tripId: string,
    docId: string,
    fileName: string
): string {
    return `users/${uploaderUid}/trips/${tripId}/documents/${docId}_${sanitizeFileName(fileName)}`;
}

export function validateTripDocumentFile(file: File): void {
    if (file.size > TRIP_DOCUMENT_LIMITS.MAX_FILE_BYTES) {
        throw new Error(TRIP_DOCUMENT_FILE_TOO_LARGE);
    }
    const allowed = TRIP_DOCUMENT_LIMITS.ALLOWED_MIME_PREFIXES.some((prefix) =>
        file.type.startsWith(prefix)
    );
    if (!allowed) {
        throw new Error(TRIP_DOCUMENT_TYPE_NOT_ALLOWED);
    }
}

export async function getUserTripDocumentBytesUsed(userId: string): Promise<number> {
    const snap = await getDoc(doc(db, 'users', userId));
    const used = snap.data()?.tripDocumentBytesUsed;
    return typeof used === 'number' && used > 0 ? used : 0;
}

async function assertQuotaAvailable(userId: string, nextBytes: number): Promise<void> {
    const used = await getUserTripDocumentBytesUsed(userId);
    if (used + nextBytes > TRIP_DOCUMENT_LIMITS.MAX_USER_BYTES) {
        throw new Error(TRIP_DOCUMENT_QUOTA_EXCEEDED);
    }
}

function firestoreTimestampToMs(raw: unknown): number {
    if (typeof raw === 'number') return raw;
    if (raw && typeof raw === 'object' && 'seconds' in raw) {
        return (raw as { seconds: number }).seconds * 1000;
    }
    if (raw && typeof raw === 'object' && 'toDate' in raw) {
        return (raw as { toDate: () => Date }).toDate().getTime();
    }
    return Date.now();
}

export function mapFirestoreTripDocument(
    tripId: string,
    id: string,
    data: Record<string, unknown>
): TripDocument {
    return {
        id,
        tripId,
        fileName: String(data.fileName || 'document'),
        title: data.title ? String(data.title) : undefined,
        mimeType: String(data.mimeType || 'application/octet-stream'),
        sizeBytes: Number(data.sizeBytes || 0),
        storagePath: String(data.storagePath || ''),
        downloadUrl: data.downloadUrl ? String(data.downloadUrl) : undefined,
        uploadedByUid: String(data.uploadedByUid || ''),
        uploadedByName: String(data.uploadedByName || ''),
        createdAt: firestoreTimestampToMs(data.createdAt),
        expenseId: data.expenseId ? String(data.expenseId) : undefined,
        deleted: data.deleted === true,
        deletedAt: data.deletedAt ? firestoreTimestampToMs(data.deletedAt) : undefined,
        deletedByUid: data.deletedByUid ? String(data.deletedByUid) : undefined,
        localPath: data.localPath ? String(data.localPath) : undefined,
    };
}

/** Trim + cap the user-facing document label. Returns undefined when blank so
 * display falls back to the technical file name. */
export function normalizeTripDocumentTitle(raw: string | undefined): string | undefined {
    const trimmed = (raw ?? '').trim().slice(0, 120);
    return trimmed.length > 0 ? trimmed : undefined;
}

export async function createTripDocumentLocalFirst(
    tripId: string,
    file: File,
    actor: TripActivityActor,
    expenseId?: string,
    clientId?: string,
    title?: string
): Promise<TripDocument> {
    validateTripDocumentFile(file);
    await assertQuotaAvailable(actor.uid, file.size);

    const docId = clientId || `doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const localPath = buildTripDocumentLocalPath(tripId, docId, file.name);
    await saveTripDocumentLocal(localPath, file);

    const storagePath = buildTripDocumentStoragePath(actor.uid, tripId, docId, file.name);

    return {
        id: docId,
        tripId,
        fileName: file.name,
        title: normalizeTripDocumentTitle(title),
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
        storagePath,
        uploadedByUid: actor.uid,
        uploadedByName: actor.displayName,
        createdAt: Date.now(),
        expenseId,
        localPath,
        pendingSync: true,
        localOnly: true,
        uploadPending: true,
    };
}

export async function uploadTripDocumentBinary(
    document: TripDocument,
    file: Blob | File
): Promise<{ downloadUrl: string }> {
    const downloadUrl = await uploadFile(document.storagePath, file);
    return { downloadUrl };
}

export async function persistTripDocumentMetadata(
    document: TripDocument,
    actor: TripActivityActor,
    downloadUrl: string
): Promise<void> {
    if (document.tripId.startsWith('local_')) return;

    const docRef = doc(db, 'trips', document.tripId, 'documents', document.id);

    // Idempotency: a retried outbox flush (or a re-sync after a post-write failure)
    // must not re-`setDoc`, which Firestore rules would reject as an update with
    // `deleted:false` (only tombstone updates are allowed). If it already exists the
    // first write completed — including downloadUrl — so we can safely no-op.
    const existing = await getDoc(docRef);
    if (existing.exists()) return;

    await setDoc(docRef, {
        fileName: document.fileName,
        title: document.title ?? null,
        mimeType: document.mimeType,
        sizeBytes: document.sizeBytes,
        storagePath: document.storagePath,
        downloadUrl,
        uploadedByUid: document.uploadedByUid,
        uploadedByName: document.uploadedByName,
        expenseId: document.expenseId ?? null,
        createdAt: serverTimestamp(),
        deleted: false,
    });

    // Quota (users/{uid}.tripDocumentBytesUsed) is reconciled server-side by the
    // `onTripDocumentWritten` Cloud Function — never mutated from the client.

    await updateDoc(doc(db, 'trips', document.tripId), {
        updatedAt: serverTimestamp(),
    });

    await logTripActivity(document.tripId, 'document_added', actor, {
        documentId: document.id,
        documentName: document.title || document.fileName,
        expenseId: document.expenseId,
    });
}

/**
 * Renames a synced document (title-only update). Firestore rules allow this as a
 * `title`-only diff that keeps `deleted:false`. No-ops for local-only trips.
 */
export async function renameTripDocument(
    tripId: string,
    documentId: string,
    title: string | undefined
): Promise<void> {
    if (tripId.startsWith('local_')) return;
    const docRef = doc(db, 'trips', tripId, 'documents', documentId);
    await updateDoc(docRef, { title: normalizeTripDocumentTitle(title) ?? null });
}

export async function tombstoneTripDocument(
    tripId: string,
    document: TripDocument,
    actor: TripActivityActor
): Promise<void> {
    if (tripId.startsWith('local_')) return;

    const docRef = doc(db, 'trips', tripId, 'documents', document.id);
    await updateDoc(docRef, {
        deleted: true,
        deletedAt: serverTimestamp(),
        deletedByUid: actor.uid,
    });

    // Quota decrement + Storage binary deletion are handled server-side by the
    // `onTripDocumentWritten` Cloud Function (works even when an owner deletes a
    // teammate's file, which the client is not permitted to reconcile).

    await updateDoc(doc(db, 'trips', tripId), {
        updatedAt: serverTimestamp(),
    });

    await logTripActivity(tripId, 'document_deleted', actor, {
        documentId: document.id,
        documentName: document.fileName,
    });
}

export function subscribeTripDocuments(
    tripId: string,
    onChange: (docs: TripDocument[]) => void,
    onError?: (err: unknown) => void
): () => void {
    const q = query(collection(db, 'trips', tripId, 'documents'), orderBy('createdAt', 'desc'));
    return onSnapshot(
        q,
        (snapshot) => {
            const docs = snapshot.docs
                .map((d) => mapFirestoreTripDocument(tripId, d.id, d.data() as Record<string, unknown>))
                .filter((d) => !d.deleted);
            onChange(docs);
        },
        (err) => onError?.(err)
    );
}

export function tripFinishedAtMs(trip: { finishedAt?: unknown }): number | null {
    const raw = trip.finishedAt;
    if (!raw) return null;
    if (typeof raw === 'string') return new Date(raw).getTime();
    if (raw && typeof raw === 'object' && 'seconds' in raw) {
        return (raw as { seconds: number }).seconds * 1000;
    }
    if (raw && typeof raw === 'object' && 'toDate' in raw) {
        return (raw as { toDate: () => Date }).toDate().getTime();
    }
    return null;
}

export function isLocalCacheExpiredForCompletedTrip(finishedAtMs: number | null): boolean {
    if (!finishedAtMs) return false;
    const graceMs = TRIP_DOCUMENT_LIMITS.LOCAL_CACHE_GRACE_DAYS * 24 * 60 * 60 * 1000;
    return Date.now() - finishedAtMs > graceMs;
}
