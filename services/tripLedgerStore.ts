import type { Expense, Trip } from '../types/trips';
import type { ExchangeRates } from '../types/trips';

const DB_NAME = 'hidden_trip_ledger';
const DB_VERSION = 1;

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
