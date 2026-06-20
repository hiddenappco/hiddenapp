import type { Expense, Trip, TripActivityEntry } from '../types/trips';
import type { ExchangeRates } from '../types/trips';
import { TRIP_LEDGER_LIMITS } from '../config/constants';

const DB_NAME = 'hidden_trip_ledger';
const DB_VERSION = 2;

export type OutboxOp =
    | 'add_expense'
    | 'delete_expense'
    | 'create_trip'
    | 'finish_trip';

export interface OutboxEntry {
    id: string;
    tripId: string;
    op: OutboxOp;
    payload: Record<string, unknown>;
    tempId?: string;
    createdAt: number;
}

function openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains('outbox')) {
                db.createObjectStore('outbox', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('trips')) {
                db.createObjectStore('trips', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('expenses')) {
                const store = db.createObjectStore('expenses', { keyPath: 'id' });
                store.createIndex('tripId', 'tripId', { unique: false });
            }
            if (!db.objectStoreNames.contains('meta')) {
                db.createObjectStore('meta', { keyPath: 'key' });
            }
            if (!db.objectStoreNames.contains('activity')) {
                const store = db.createObjectStore('activity', { keyPath: 'id' });
                store.createIndex('tripId', 'tripId', { unique: false });
            }
        };
    });
}

async function withStore<T>(
    storeName: string,
    mode: IDBTransactionMode,
    fn: (store: IDBObjectStore) => IDBRequest<T> | void
): Promise<T | void> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, mode);
        const store = tx.objectStore(storeName);
        const result = fn(store);
        tx.oncomplete = () => resolve(result ? (result as IDBRequest<T>).result : undefined);
        tx.onerror = () => reject(tx.error);
    });
}

export async function getActiveTripIdLocal(): Promise<string | null> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('meta', 'readonly');
        const req = tx.objectStore('meta').get('activeTripId');
        req.onsuccess = () => resolve((req.result?.value as string) || null);
        req.onerror = () => reject(req.error);
    });
}

export async function setActiveTripIdLocal(tripId: string | null): Promise<void> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('meta', 'readwrite');
        if (tripId) {
            tx.objectStore('meta').put({ key: 'activeTripId', value: tripId });
        } else {
            tx.objectStore('meta').delete('activeTripId');
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

export async function cacheTripMirror(trip: Trip): Promise<void> {
    await withStore('trips', 'readwrite', (store) => store.put(trip));
}

export async function listAllTripsMirror(): Promise<Trip[]> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('trips', 'readonly');
        const req = tx.objectStore('trips').getAll();
        req.onsuccess = () => resolve((req.result as Trip[]) || []);
        req.onerror = () => reject(req.error);
    });
}

function tripSortTime(trip: Trip): number {
    const created = trip as Trip & { createdAt?: { seconds?: number } };
    if (created.createdAt?.seconds) return created.createdAt.seconds * 1000;
    const finished = trip as Trip & { finishedAt?: { seconds?: number } };
    if (finished.finishedAt?.seconds) return finished.finishedAt.seconds * 1000;
    return 0;
}

export function userOwnsTrip(trip: Trip, userId: string): boolean {
    if (trip.userId === userId || trip.ownerId === userId) return true;
    return trip.memberIds?.includes(userId) ?? false;
}

export async function listCompletedTripsMirror(
    userId: string,
    limit = TRIP_LEDGER_LIMITS.MAX_PAST_TRIPS
): Promise<Trip[]> {
    const all = await listAllTripsMirror();
    return all
        .filter((t) => t.status === 'completed' && userOwnsTrip(t, userId))
        .sort((a, b) => tripSortTime(b) - tripSortTime(a))
        .slice(0, limit);
}

export async function cachePastTripsMirror(trips: Trip[]): Promise<void> {
    await Promise.all(trips.map((trip) => cacheTripMirror(trip)));
}

export async function pruneCompletedTripsMirror(userId: string, keepIds: Set<string>): Promise<void> {
    const all = await listAllTripsMirror();
    for (const trip of all) {
        if (trip.status === 'completed' && userOwnsTrip(trip, userId) && !keepIds.has(trip.id)) {
            await removeTripMirror(trip.id);
        }
    }
}

export async function removeTripMirror(tripId: string): Promise<void> {
    await withStore('trips', 'readwrite', (store) => store.delete(tripId));
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(['expenses', 'activity'], 'readwrite');
        for (const storeName of ['expenses', 'activity'] as const) {
            const store = tx.objectStore(storeName);
            const index = store.index('tripId');
            const range = IDBKeyRange.only(tripId);
            const cursorReq = index.openCursor(range);
            cursorReq.onsuccess = () => {
                const cursor = cursorReq.result;
                if (cursor) {
                    store.delete(cursor.primaryKey);
                    cursor.continue();
                }
            };
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

export async function getTripMirror(tripId: string): Promise<Trip | null> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('trips', 'readonly');
        const req = tx.objectStore('trips').get(tripId);
        req.onsuccess = () => resolve((req.result as Trip) || null);
        req.onerror = () => reject(req.error);
    });
}

export async function cacheExpensesMirror(tripId: string, expenses: Expense[]): Promise<void> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('expenses', 'readwrite');
        const store = tx.objectStore('expenses');
        const index = store.index('tripId');
        const range = IDBKeyRange.only(tripId);
        // IndexedDB runs queued puts before the cursor's deletes, so only delete
        // rows that are NOT part of the new set; puts then overwrite/insert the rest.
        const nextIds = new Set(expenses.map((e) => e.id));
        const cursorReq = index.openCursor(range);
        cursorReq.onsuccess = () => {
            const cursor = cursorReq.result;
            if (cursor) {
                if (!nextIds.has(String((cursor.value as { id?: unknown }).id))) {
                    store.delete(cursor.primaryKey);
                }
                cursor.continue();
            }
        };
        for (const exp of expenses) {
            store.put({ ...exp, tripId });
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

export async function getExpensesMirror(tripId: string): Promise<Expense[]> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('expenses', 'readonly');
        const index = tx.objectStore('expenses').index('tripId');
        const req = index.getAll(tripId);
        req.onsuccess = () => {
            const rows = (req.result || []) as (Expense & { tripId: string })[];
            resolve(rows.map(({ tripId: _, ...rest }) => rest));
        };
        req.onerror = () => reject(req.error);
    });
}

export async function addOutboxEntry(entry: OutboxEntry): Promise<void> {
    await withStore('outbox', 'readwrite', (store) => store.put(entry));
}

export async function getOutboxEntries(): Promise<OutboxEntry[]> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('outbox', 'readonly');
        const req = tx.objectStore('outbox').getAll();
        req.onsuccess = () => {
            const items = (req.result as OutboxEntry[]).sort((a, b) => a.createdAt - b.createdAt);
            resolve(items);
        };
        req.onerror = () => reject(req.error);
    });
}

export async function removeOutboxEntry(id: string): Promise<void> {
    await withStore('outbox', 'readwrite', (store) => store.delete(id));
}

export async function remapTripIdInOutbox(oldId: string, newId: string): Promise<void> {
    const entries = await getOutboxEntries();
    for (const entry of entries) {
        if (entry.tripId === oldId) {
            await addOutboxEntry({ ...entry, tripId: newId });
            await removeOutboxEntry(entry.id);
        }
    }
}

const RATES_META_KEY = 'exchangeRates';

export async function cacheExchangeRatesLocal(rates: ExchangeRates): Promise<void> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('meta', 'readwrite');
        tx.objectStore('meta').put({ key: RATES_META_KEY, value: rates });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

export async function getExchangeRatesLocal(): Promise<ExchangeRates | null> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('meta', 'readonly');
        const req = tx.objectStore('meta').get(RATES_META_KEY);
        req.onsuccess = () => resolve((req.result?.value as ExchangeRates) || null);
        req.onerror = () => reject(req.error);
    });
}

export function makeTempId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

type StoredActivity = TripActivityEntry & { tripId: string };

export async function appendActivityMirror(tripId: string, entry: TripActivityEntry): Promise<void> {
    await withStore('activity', 'readwrite', (store) =>
        store.put({ ...entry, tripId } satisfies StoredActivity)
    );
}

export async function getActivityMirror(tripId: string): Promise<TripActivityEntry[]> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('activity', 'readonly');
        const index = tx.objectStore('activity').index('tripId');
        const req = index.getAll(tripId);
        req.onsuccess = () => {
            const rows = (req.result || []) as StoredActivity[];
            resolve(
                rows
                    .map(({ tripId: _, ...rest }) => rest)
                    .sort((a, b) => b.createdAt - a.createdAt)
            );
        };
        req.onerror = () => reject(req.error);
    });
}

export async function cacheActivityMirror(tripId: string, entries: TripActivityEntry[]): Promise<void> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('activity', 'readwrite');
        const store = tx.objectStore('activity');
        const index = store.index('tripId');
        const range = IDBKeyRange.only(tripId);
        const nextIds = new Set(entries.map((e) => e.id));
        const cursorReq = index.openCursor(range);
        cursorReq.onsuccess = () => {
            const cursor = cursorReq.result;
            if (cursor) {
                const row = cursor.value as StoredActivity;
                if (!nextIds.has(row.id) && !row.pendingSync) {
                    store.delete(cursor.primaryKey);
                }
                cursor.continue();
            }
        };
        for (const entry of entries) {
            store.put({ ...entry, tripId } satisfies StoredActivity);
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

export async function prunePendingActivityForExpense(tripId: string, expenseId: string): Promise<void> {
    const mirror = await getActivityMirror(tripId);
    const kept = mirror.filter((e) => e.expenseId !== expenseId || !e.pendingSync);
    await cacheActivityMirror(tripId, kept);
}
