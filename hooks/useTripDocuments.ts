import { useCallback, useEffect, useState } from 'react';
import type { TripDocument } from '../types/trips';
import { cacheDocumentsMirror, getDocumentsMirror } from '../services/tripLedgerStore';
import { mapFirestoreTripDocument, subscribeTripDocuments } from '../services/tripDocumentService';

function mergeDocuments(remote: TripDocument[], local: TripDocument[]): TripDocument[] {
    const remoteIds = new Set(remote.map((d) => d.id));
    const localById = new Map(local.map((d) => [d.id, d]));
    const pendingLocal = local.filter((d) => d.pendingSync || d.localOnly || d.uploadPending);
    // Firestore never stores `localPath` (device-only). Re-attach it from the mirror
    // so the uploader keeps offline access to a doc after it syncs.
    const enrichedRemote = remote.map((d) => {
        const localMatch = localById.get(d.id);
        return localMatch?.localPath ? { ...d, localPath: localMatch.localPath } : d;
    });
    const merged = [
        ...pendingLocal.filter((d) => !remoteIds.has(d.id)),
        ...enrichedRemote,
    ];
    return merged.sort((a, b) => b.createdAt - a.createdAt);
}

export function useTripDocuments(tripId: string | undefined, isOnline = true) {
    const [documents, setDocuments] = useState<TripDocument[]>([]);
    const [loading, setLoading] = useState(true);

    const refreshMirror = useCallback(async () => {
        if (!tripId) return;
        const mirror = await getDocumentsMirror(tripId);
        if (mirror.length) setDocuments(mirror);
        if (!isOnline) setLoading(false);
    }, [tripId, isOnline]);

    useEffect(() => {
        if (!tripId) {
            setDocuments([]);
            setLoading(false);
            return;
        }

        refreshMirror();

        if (!isOnline) return;

        const unsubscribe = subscribeTripDocuments(
            tripId,
            async (remote) => {
                const local = await getDocumentsMirror(tripId);
                const merged = mergeDocuments(remote, local);
                setDocuments(merged);
                await cacheDocumentsMirror(tripId, merged);
                setLoading(false);
            },
            async () => {
                const mirror = await getDocumentsMirror(tripId);
                setDocuments(mirror);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [tripId, isOnline, refreshMirror]);

    return { documents, loading, refreshMirror };
}

export function mapRemoteTripDocument(
    tripId: string,
    id: string,
    data: Record<string, unknown>
): TripDocument {
    return mapFirestoreTripDocument(tripId, id, data);
}
