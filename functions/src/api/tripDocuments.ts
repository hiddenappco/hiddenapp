import { onDocumentWritten, onDocumentDeleted } from "firebase-functions/v2/firestore";
import { FieldValue } from "firebase-admin/firestore";
import { db, storage } from "../config/firebase";

function isActive(data: FirebaseFirestore.DocumentData | undefined): boolean {
    return data ? data.deleted !== true : false;
}

async function addQuota(uid: string, deltaBytes: number): Promise<void> {
    if (!uid || deltaBytes === 0) return;
    await db
        .collection("users")
        .doc(uid)
        .set({ tripDocumentBytesUsed: FieldValue.increment(deltaBytes) }, { merge: true });
}

async function subtractQuotaFloored(uid: string, bytes: number): Promise<void> {
    if (!uid || bytes <= 0) return;
    const ref = db.collection("users").doc(uid);
    await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const current = Number(snap.data()?.tripDocumentBytesUsed || 0);
        const next = Math.max(0, current - bytes);
        tx.set(ref, { tripDocumentBytesUsed: next }, { merge: true });
    });
}

async function purgeStorage(storagePath: string): Promise<void> {
    if (!storagePath) return;
    try {
        await storage.bucket().file(storagePath).delete();
    } catch (err) {
        // Object may already be gone (retry, manual cleanup, never uploaded).
        console.warn(`[onTripDocumentWritten] storage delete skipped: ${storagePath}`, err);
    }
}

/**
 * Server-authoritative lifecycle for trip documents (`P1-OFF-01`).
 *
 * Quota (`users/{uid}.tripDocumentBytesUsed`) and the Storage binary are managed
 * here — never by the client — so that:
 *  - an owner deleting a teammate's file reconciles the *teammate's* quota
 *    (Firestore rules forbid a client writing another user's doc);
 *  - the physical binary is always freed on tombstone / hard delete;
 *  - the counter can never drift negative.
 *
 * Transitions:
 *  - inactive → active (create / restore): +sizeBytes to uploader.
 *  - active → inactive (tombstone `deleted:true` OR hard delete): -sizeBytes
 *    (floored at 0) + delete Storage object.
 */
export const onTripDocumentWritten = onDocumentWritten(
    "trips/{tripId}/documents/{docId}",
    async (event) => {
        const before = event.data?.before?.data();
        const after = event.data?.after?.data();

        const beforeActive = isActive(before);
        const afterActive = isActive(after);

        if (!beforeActive && afterActive && after) {
            await addQuota(String(after.uploadedByUid || ""), Number(after.sizeBytes || 0));
            return;
        }

        if (beforeActive && !afterActive && before) {
            await subtractQuotaFloored(
                String(before.uploadedByUid || ""),
                Number(before.sizeBytes || 0)
            );
            await purgeStorage(String(before.storagePath || ""));
        }
    }
);

/**
 * Cascade cleanup when a whole trip is hard-deleted. Firestore does not delete
 * subcollections with their parent, so we remove every document doc — each
 * deletion re-enters `onTripDocumentWritten`, which frees the uploader's quota
 * and purges the Storage binary. Already-tombstoned docs are no-ops (idempotent).
 */
export const onTripDeletedCleanupDocuments = onDocumentDeleted(
    "trips/{tripId}",
    async (event) => {
        const tripId = event.params.tripId;
        const docsSnap = await db
            .collection("trips")
            .doc(tripId)
            .collection("documents")
            .get();
        if (docsSnap.empty) return;

        let batch = db.batch();
        let pending = 0;
        for (const docSnap of docsSnap.docs) {
            batch.delete(docSnap.ref);
            pending += 1;
            if (pending >= 400) {
                await batch.commit();
                batch = db.batch();
                pending = 0;
            }
        }
        if (pending > 0) {
            await batch.commit();
        }
        console.log(
            `[onTripDeletedCleanupDocuments] trip=${tripId} removed=${docsSnap.size} document(s)`
        );
    }
);
