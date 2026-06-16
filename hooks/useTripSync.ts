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
} from '../services/tripLedgerStore';
import {
    addExpenseToTrip,
    deleteExpenseFromTrip,
    createTrip as createTripRemote,
    createGroupTrip as createGroupTripRemote,
    finishTrip as finishTripRemote,
} from './useTrips';
import type { Expense } from '../types/trips';

export function useTripSync(userId: string | undefined) {
    const isOnline = useNetworkStatus();
    const [pendingCount, setPendingCount] = useState(0);
    const [syncing, setSyncing] = useState(false);
    const syncingRef = useRef(false);

    const refreshPendingCount = useCallback(async () => {
        const entries = await getOutboxEntries();
        setPendingCount(entries.length);
    }, []);

    const flushOutbox = useCallback(async () => {
        if (!userId || !isOnline || syncingRef.current) return;
        syncingRef.current = true;
        setSyncing(true);
        try {
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
                        if (entry.tripId.startsWith('local_')) {
                            await remapTripIdInOutbox(entry.tripId, realId);
                            const localId = await getActiveTripIdLocal();
                            if (localId === entry.tripId) {
                                await setActiveTripIdLocal(realId);
                            }
                        }
                    } else if (entry.op === 'add_expense') {
                        const expense = entry.payload.expense as Expense;
                        const { tempId } = entry;
                        const realExpenseId = await addExpenseToTrip(entry.tripId, expense, tempId);
                        if (tempId && realExpenseId) {
                            const mirror = await getExpensesMirror(entry.tripId);
                            const updated = mirror.map((e) =>
                                e.id === tempId ? { ...e, id: realExpenseId, pendingSync: false, localOnly: false } : e
                            );
                            await cacheExpensesMirror(entry.tripId, updated);
                        }
                    } else if (entry.op === 'delete_expense') {
                        const { expenseId, amount } = entry.payload as { expenseId: string; amount: number };
                        if (!expenseId.startsWith('temp_')) {
                            await deleteExpenseFromTrip(entry.tripId, expenseId, amount);
                        }
                    } else if (entry.op === 'finish_trip') {
                        const { total } = entry.payload as { total: number };
                        if (!entry.tripId.startsWith('local_')) {
                            await finishTripRemote(entry.tripId, total);
                        }
                    }
                    await removeOutboxEntry(entry.id);
                } catch (err) {
                    console.error('[useTripSync] Failed op:', entry.op, err);
                    break;
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
        async (tripId: string, expense: Expense, tempId: string) => {
            const mirror = await getExpensesMirror(tripId);
            await cacheExpensesMirror(tripId, [
                { ...expense, id: tempId, pendingSync: true, localOnly: true },
                ...mirror.filter((e) => e.id !== tempId),
            ]);
            await addOutboxEntry({
                id: makeTempId('op'),
                tripId,
                op: 'add_expense',
                tempId,
                payload: { expense },
                createdAt: Date.now(),
            });
            await refreshPendingCount();
        },
        [refreshPendingCount]
    );

    const queueDeleteExpense = useCallback(
        async (tripId: string, expenseId: string, amount: number) => {
            const mirror = await getExpensesMirror(tripId);
            await cacheExpensesMirror(
                tripId,
                mirror.filter((e) => e.id !== expenseId)
            );
            if (!expenseId.startsWith('temp_')) {
                await addOutboxEntry({
                    id: makeTempId('op'),
                    tripId,
                    op: 'delete_expense',
                    payload: { expenseId, amount },
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

    const cacheTrip = useCallback(async (trip: Parameters<typeof cacheTripMirror>[0]) => {
        await cacheTripMirror(trip);
        await setActiveTripIdLocal(trip.status === 'active' ? trip.id : null);
    }, []);

    return {
        isOnline,
        pendingCount,
        syncing,
        flushOutbox,
        queueCreateTrip,
        queueAddExpense,
        queueDeleteExpense,
        queueFinishTrip,
        cacheTrip,
        refreshPendingCount,
    };
}
