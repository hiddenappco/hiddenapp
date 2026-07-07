import { useEffect, useRef, useCallback, useState } from 'react';
import { useNetworkStatus } from './useNetworkStatus';
import {
    addOutboxEntry,
    getOutboxEntries,
    removeOutboxEntry,
    remapTripIdInOutbox,
    makeTempId,
    setActiveTripIdLocal,
    getActiveTripIdLocal,
    cacheTripMirror,
    getTripMirror,
    cacheExpensesMirror,
    getExpensesMirror,
    appendActivityMirror,
    cacheDocumentsMirror,
    getDocumentsMirror,
    upsertDocumentMirror,
    removeDocumentMirror,
} from '../services/tripLedgerStore';
import {
    addExpenseToTrip,
    deleteExpenseFromTrip,
    createTrip as createTripRemote,
    createGroupTrip as createGroupTripRemote,
    finishTrip as finishTripRemote,
} from './useTrips';
import type { Expense, TripActivityActor, TripActivityEntry, TripDocument } from '../types/trips';
import { readTripDocumentLocalBlob } from '../services/tripDocumentFileStore';
import {
    persistTripDocumentMetadata,
    renameTripDocument,
    tombstoneTripDocument,
    uploadTripDocumentBinary,
} from '../services/tripDocumentService';

export function useTripSync(userId: string | undefined) {
    const isOnline = useNetworkStatus();
    const [pendingCount, setPendingCount] = useState(0);
    const [syncing, setSyncing] = useState(false);
    const [reconcileHint, setReconcileHint] = useState(false);
    const syncingRef = useRef(false);
    const prevPendingRef = useRef(0);

    const refreshPendingCount = useCallback(async () => {
        const entries = await getOutboxEntries();
        setPendingCount(entries.length);
    }, []);

    const flushOutbox = useCallback(async () => {
        if (!userId || !isOnline || syncingRef.current) return;
        syncingRef.current = true;
        setSyncing(true);
        try {
            // Reload entries from a fresh pass whenever a create_trip remaps a
            // local_* id, so subsequent ops use the real (server) trip id rather
            // than the stale in-memory snapshot.
            let restart = true;
            while (restart) {
                restart = false;
                const entries = await getOutboxEntries();
                for (const entry of entries) {
                    try {
                        if (entry.op === 'create_trip') {
                            const { name, location, isGroup, displayName, defaultCurrency } = entry.payload as {
                                name: string;
                                location: string;
                                isGroup?: boolean;
                                displayName?: string;
                                defaultCurrency?: string;
                            };
                            const realId = isGroup
                                ? await createGroupTripRemote(userId, name, location, displayName || 'Viajero', defaultCurrency as 'COP' | 'USD' | 'EUR' | undefined)
                                : await createTripRemote(userId, name, location, defaultCurrency as 'COP' | 'USD' | 'EUR' | undefined);
                            await removeOutboxEntry(entry.id);
                            if (entry.tripId.startsWith('local_')) {
                                await remapTripIdInOutbox(entry.tripId, realId);
                                const localId = await getActiveTripIdLocal();
                                if (localId === entry.tripId) {
                                    await setActiveTripIdLocal(realId);
                                }
                                // Outbox was rewritten: re-read it before continuing.
                                restart = true;
                                break;
                            }
                            continue;
                        } else if (entry.op === 'add_expense') {
                            const expense = entry.payload.expense as Expense;
                            const actor = entry.payload.actor as TripActivityActor | undefined;
                            const { tempId } = entry;
                            const realExpenseId = await addExpenseToTrip(entry.tripId, expense, tempId, actor);
                            if (tempId && realExpenseId) {
                                const mirror = await getExpensesMirror(entry.tripId);
                                const updated = mirror.map((e) =>
                                    e.id === tempId ? { ...e, id: realExpenseId, pendingSync: false, localOnly: false } : e
                                );
                                await cacheExpensesMirror(entry.tripId, updated);
                            }
                        } else if (entry.op === 'delete_expense') {
                            const { expenseId, amount, actor, note, category } = entry.payload as {
                                expenseId: string;
                                amount: number;
                                actor?: TripActivityActor;
                                note?: string;
                                category?: Expense['category'];
                            };
                            if (!expenseId.startsWith('temp_')) {
                                await deleteExpenseFromTrip(entry.tripId, expenseId, amount, actor, {
                                    note,
                                    category,
                                });
                            }
                        } else if (entry.op === 'finish_trip') {
                            const { total } = entry.payload as { total: number };
                            if (!entry.tripId.startsWith('local_')) {
                                await finishTripRemote(entry.tripId, total, userId);
                            }
                        } else if (entry.op === 'add_document') {
                            const document = {
                                ...(entry.payload.document as TripDocument),
                                tripId: entry.tripId,
                            };
                            const actor = entry.payload.actor as TripActivityActor;
                            if (!entry.tripId.startsWith('local_') && document.localPath) {
                                const blob = await readTripDocumentLocalBlob(
                                    document.localPath,
                                    document.mimeType
                                );
                                if (!blob) throw new Error('Local document blob missing');
                                const { downloadUrl } = await uploadTripDocumentBinary(document, blob);
                                await persistTripDocumentMetadata(document, actor, downloadUrl);
                                const mirror = await getDocumentsMirror(entry.tripId);
                                const updated = mirror.map((d) =>
                                    d.id === document.id
                                        ? {
                                              ...d,
                                              downloadUrl,
                                              pendingSync: false,
                                              localOnly: false,
                                              uploadPending: false,
                                          }
                                        : d
                                );
                                await cacheDocumentsMirror(entry.tripId, updated);
                            }
                        } else if (entry.op === 'rename_document') {
                            const { documentId, title } = entry.payload as {
                                documentId: string;
                                title?: string;
                            };
                            if (!entry.tripId.startsWith('local_')) {
                                await renameTripDocument(entry.tripId, documentId, title);
                            }
                        } else if (entry.op === 'delete_document') {
                            const document = {
                                ...(entry.payload.document as TripDocument),
                                tripId: entry.tripId,
                            };
                            const actor = entry.payload.actor as TripActivityActor;
                            if (!entry.tripId.startsWith('local_')) {
                                await tombstoneTripDocument(entry.tripId, document, actor);
                            }
                            await removeDocumentMirror(entry.tripId, document.id);
                        }
                        await removeOutboxEntry(entry.id);
                    } catch (err) {
                        console.error('[useTripSync] Failed op:', entry.op, err);
                        restart = false;
                        break;
                    }
                }
            }
        } finally {
            syncingRef.current = false;
            setSyncing(false);
            await refreshPendingCount();
        }
    }, [userId, isOnline, refreshPendingCount]);

    useEffect(() => {
        refreshPendingCount();
    }, [refreshPendingCount]);

    useEffect(() => {
        const prev = prevPendingRef.current;
        if (prev > 0 && pendingCount === 0 && isOnline && !syncing) {
            setReconcileHint(true);
        }
        if (pendingCount > 0 || !isOnline) {
            setReconcileHint(false);
        }
        prevPendingRef.current = pendingCount;
    }, [pendingCount, isOnline, syncing]);

    useEffect(() => {
        if (isOnline && userId) {
            flushOutbox();
        }
    }, [isOnline, userId, flushOutbox]);

    const queueCreateTrip = useCallback(
        async (tripId: string, payload: Record<string, unknown>) => {
            await addOutboxEntry({
                id: makeTempId('op'),
                tripId,
                op: 'create_trip',
                payload,
                createdAt: Date.now(),
            });
            await setActiveTripIdLocal(tripId);
            await refreshPendingCount();
        },
        [refreshPendingCount]
    );

    const queueAddExpense = useCallback(
        async (tripId: string, expense: Expense, tempId: string, actor?: TripActivityActor) => {
            const mirror = await getExpensesMirror(tripId);
            await cacheExpensesMirror(tripId, [
                { ...expense, id: tempId, pendingSync: true, localOnly: true },
                ...mirror.filter((e) => e.id !== tempId),
            ]);
            if (actor) {
                const localActivity: TripActivityEntry = {
                    id: makeTempId('local_act'),
                    kind: 'expense_added',
                    actorUid: actor.uid,
                    actorName: actor.displayName,
                    createdAt: Date.now(),
                    expenseId: tempId,
                    amountCOP: expense.amount,
                    note: expense.note,
                    category: expense.category,
                    pendingSync: true,
                    localOnly: true,
                };
                await appendActivityMirror(tripId, localActivity);
            }
            await addOutboxEntry({
                id: makeTempId('op'),
                tripId,
                op: 'add_expense',
                tempId,
                payload: { expense, actor },
                createdAt: Date.now(),
            });
            await refreshPendingCount();
        },
        [refreshPendingCount]
    );

    const queueDeleteExpense = useCallback(
        async (
            tripId: string,
            expenseId: string,
            amount: number,
            actor?: TripActivityActor,
            meta?: { note?: string; category?: Expense['category'] }
        ) => {
            const mirror = await getExpensesMirror(tripId);
            const removed = mirror.find((e) => e.id === expenseId);
            await cacheExpensesMirror(
                tripId,
                mirror.filter((e) => e.id !== expenseId)
            );
            if (actor) {
                const localActivity: TripActivityEntry = {
                    id: makeTempId('local_act'),
                    kind: 'expense_deleted',
                    actorUid: actor.uid,
                    actorName: actor.displayName,
                    createdAt: Date.now(),
                    expenseId,
                    amountCOP: amount,
                    note: meta?.note ?? removed?.note,
                    category: meta?.category ?? removed?.category,
                    pendingSync: true,
                    localOnly: true,
                };
                await appendActivityMirror(tripId, localActivity);
            }
            if (!expenseId.startsWith('temp_')) {
                await addOutboxEntry({
                    id: makeTempId('op'),
                    tripId,
                    op: 'delete_expense',
                    payload: { expenseId, amount, actor, note: meta?.note ?? removed?.note, category: meta?.category ?? removed?.category },
                    createdAt: Date.now(),
                });
            } else {
                const entries = await getOutboxEntries();
                const pendingAdd = entries.find((e) => e.tempId === expenseId);
                if (pendingAdd) await removeOutboxEntry(pendingAdd.id);
            }
            await refreshPendingCount();
        },
        [refreshPendingCount]
    );

    const queueFinishTrip = useCallback(
        async (tripId: string, total: number) => {
            const existing = await getTripMirror(tripId);
            if (existing) {
                await cacheTripMirror({ ...existing, status: 'completed', totalSpent: total });
            }
            await addOutboxEntry({
                id: makeTempId('op'),
                tripId,
                op: 'finish_trip',
                payload: { total },
                createdAt: Date.now(),
            });
            await setActiveTripIdLocal(null);
            await refreshPendingCount();
        },
        [refreshPendingCount]
    );

    const queueAddDocument = useCallback(
        async (document: TripDocument, actor: TripActivityActor) => {
            await upsertDocumentMirror(document);
            await addOutboxEntry({
                id: makeTempId('op'),
                tripId: document.tripId,
                op: 'add_document',
                tempId: document.id,
                payload: { document, actor },
                createdAt: Date.now(),
            });
            await refreshPendingCount();
        },
        [refreshPendingCount]
    );

    const queueDeleteDocument = useCallback(
        async (document: TripDocument, actor: TripActivityActor) => {
            await removeDocumentMirror(document.tripId, document.id);
            // If the upload never synced, just cancel the pending add — nothing to tombstone.
            const entries = await getOutboxEntries();
            const pendingAdd = entries.find(
                (e) => e.op === 'add_document' && e.tempId === document.id
            );
            if (pendingAdd) {
                await removeOutboxEntry(pendingAdd.id);
            } else {
                await addOutboxEntry({
                    id: makeTempId('op'),
                    tripId: document.tripId,
                    op: 'delete_document',
                    payload: { document, actor },
                    createdAt: Date.now(),
                });
            }
            await refreshPendingCount();
        },
        [refreshPendingCount]
    );

    const syncDocumentNow = useCallback(
        async (document: TripDocument, actor: TripActivityActor) => {
            if (!document.localPath) throw new Error('Missing local document path');
            const blob = await readTripDocumentLocalBlob(document.localPath, document.mimeType);
            if (!blob) throw new Error('Local document blob missing');
            const { downloadUrl } = await uploadTripDocumentBinary(document, blob);
            if (!document.tripId.startsWith('local_')) {
                await persistTripDocumentMetadata(document, actor, downloadUrl);
            }
            const synced: TripDocument = {
                ...document,
                downloadUrl,
                pendingSync: false,
                localOnly: false,
                uploadPending: false,
            };
            const mirror = await getDocumentsMirror(document.tripId);
            const updated = [
                synced,
                ...mirror.filter((d) => d.id !== document.id),
            ];
            await cacheDocumentsMirror(document.tripId, updated);
            return synced;
        },
        []
    );

    const renameDocumentNow = useCallback(
        async (document: TripDocument, title: string | undefined) => {
            if (!document.tripId.startsWith('local_')) {
                await renameTripDocument(document.tripId, document.id, title);
            }
            const mirror = await getDocumentsMirror(document.tripId);
            const updated = mirror.map((d) =>
                d.id === document.id ? { ...d, title } : d
            );
            await cacheDocumentsMirror(document.tripId, updated);
        },
        []
    );

    const queueRenameDocument = useCallback(
        async (document: TripDocument, title: string | undefined) => {
            // Optimistic: reflect the new title in the local mirror right away.
            const mirror = await getDocumentsMirror(document.tripId);
            await cacheDocumentsMirror(
                document.tripId,
                mirror.map((d) => (d.id === document.id ? { ...d, title } : d))
            );

            const entries = await getOutboxEntries();
            // If the upload itself hasn't synced yet, fold the rename into that
            // pending add so it lands with the right title in a single write.
            const pendingAdd = entries.find(
                (e) => e.op === 'add_document' && e.tempId === document.id
            );
            if (pendingAdd) {
                const pendingDoc = pendingAdd.payload.document as TripDocument;
                await addOutboxEntry({
                    ...pendingAdd,
                    payload: { ...pendingAdd.payload, document: { ...pendingDoc, title } },
                });
                await refreshPendingCount();
                return;
            }

            // Collapse repeated renames of the same doc into one pending op.
            const pendingRename = entries.find(
                (e) => e.op === 'rename_document' && e.tempId === document.id
            );
            if (pendingRename) {
                await addOutboxEntry({
                    ...pendingRename,
                    payload: { documentId: document.id, title },
                });
            } else if (!document.tripId.startsWith('local_')) {
                await addOutboxEntry({
                    id: makeTempId('op'),
                    tripId: document.tripId,
                    op: 'rename_document',
                    tempId: document.id,
                    payload: { documentId: document.id, title },
                    createdAt: Date.now(),
                });
            }
            await refreshPendingCount();
        },
        [refreshPendingCount]
    );

    const cacheTrip = useCallback(async (trip: Parameters<typeof cacheTripMirror>[0]) => {
        await cacheTripMirror(trip);
        await setActiveTripIdLocal(trip.status === 'active' ? trip.id : null);
    }, []);

    return {
        isOnline,
        pendingCount,
        syncing,
        reconcileHint,
        flushOutbox,
        queueCreateTrip,
        queueAddExpense,
        queueDeleteExpense,
        queueFinishTrip,
        queueAddDocument,
        queueDeleteDocument,
        queueRenameDocument,
        syncDocumentNow,
        renameDocumentNow,
        cacheTrip,
        refreshPendingCount,
    };
}
