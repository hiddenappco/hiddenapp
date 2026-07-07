import { useState, useEffect, useCallback } from 'react';
import {
    collection,
    query,
    where,
    orderBy,
    doc,
    deleteDoc,
    onSnapshot,
    setDoc,
    updateDoc,
    serverTimestamp,
    limit,
    increment,
    getDocs,
    arrayUnion,
    getDoc,
    addDoc,
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { trackDirectEconomicInjection } from '../services/analytics';
import { generateTripCode } from '../utils/tripCode';
import type {
    Expense,
    Trip,
    TripCurrency,
    TripMember,
    TripMemberRole,
    TripActivityActor,
    TripActivityEntry,
    TripActivityKind,
    ExpenseCategory,
} from '../types/trips';
import {
    cacheExpensesMirror,
    getExpensesMirror,
    getTripMirror,
    getActiveTripIdLocal,
    cachePastTripsMirror,
    listCompletedTripsMirror,
    pruneCompletedTripsMirror,
    removeTripMirror,
    cacheTripMirror,
    cacheActivityMirror,
    getActivityMirror,
} from '../services/tripLedgerStore';
import { backfillTripMemberIds } from '../services/tripMemberBackfill';
import { TRIP_HISTORY_FULL, TRIP_LEDGER_LIMITS } from '../config/constants';

const MAX_PAST_TRIPS = TRIP_LEDGER_LIMITS.MAX_PAST_TRIPS;

/**
 * Firestore's `setDoc`/`addDoc` throw `Unsupported field value: undefined`
 * for any top-level key set to `undefined` (e.g. optional expense fields
 * like `amountOriginal`/`exchangeRate`/`splitAmong` when not applicable).
 * Strip those keys instead of sending them — omitting a field is valid,
 * an explicit `undefined` value is not.
 */
function stripUndefined<T extends Record<string, unknown>>(data: T): Partial<T> {
    const clean: Partial<T> = {};
    for (const key of Object.keys(data) as (keyof T)[]) {
        if (data[key] !== undefined) clean[key] = data[key];
    }
    return clean;
}

function maybeBackfillTrip(tripId: string, data: Record<string, unknown>) {
    void backfillTripMemberIds(tripId, data).catch((err) => {
        console.warn('[trips] memberIds backfill skipped:', tripId, err);
    });
}

const DEFAULT_IMAGE =
    'https://lh3.googleusercontent.com/aida-public/AB6AXuBNhvg_gE0mA_8071n4_D0bdAERxgfIypflcDK22qUDNPyIT3eSxfl8s8feTtPIT3Dm7OZGcWr-dsgr8J35rvqO4W_hJdZkkKT8LTjjF-YC2u17XFEx3FuSPYoeVie9qCOxcXEKpN47z1g6DoW5ziJTFklUwipxT5ZHKR8RP591mT-J6SoUWbQi9vbURUu4aP9GvSbwY8Rz4Q4ezI9A9qVFQDfAeeAWrgqh2xyVq98uYHNG2ZfV_7rq_wWQYFkZ56Qs8zm4sbY_9hrw';

function buildOwnerMember(uid: string, displayName: string): TripMember {
    return {
        uid,
        displayName,
        role: 'owner',
        joinedAt: new Date().toISOString(),
    };
}

function editorIdsFromMembers(members: TripMember[]): string[] {
    return members.filter((m) => m.role === 'owner' || m.role === 'editor').map((m) => m.uid);
}

async function uniqueTripCode(): Promise<string> {
    for (let attempt = 0; attempt < 8; attempt++) {
        const code = generateTripCode();
        const q = query(collection(db, 'trips'), where('tripCode', '==', code), limit(1));
        const snap = await getDocs(q);
        if (snap.empty) return code;
    }
    throw new Error('Could not generate unique trip code');
}

export const createTrip = async (
    userId: string,
    name: string,
    location: string,
    defaultCurrency: TripCurrency = 'COP'
) => {
    const tripRef = doc(collection(db, 'trips'));
    const now = serverTimestamp();
    const owner = buildOwnerMember(userId, 'Viajero');

    const tripData = {
        userId,
        ownerId: userId,
        type: 'solo',
        memberIds: [userId],
        editorIds: [userId],
        members: [owner],
        name,
        location,
        status: 'active',
        defaultCurrency,
        createdAt: now,
        date: new Date().toLocaleDateString('es-CO', { month: 'short', year: 'numeric' }),
        image: DEFAULT_IMAGE,
        totalSpent: 0,
    };

    await setDoc(tripRef, tripData);
    return tripRef.id;
};

export const createGroupTrip = async (
    userId: string,
    name: string,
    location: string,
    displayName: string,
    defaultCurrency: TripCurrency = 'COP'
) => {
    const tripRef = doc(collection(db, 'trips'));
    const tripCode = await uniqueTripCode();
    const now = serverTimestamp();
    const owner = buildOwnerMember(userId, displayName);

    const tripData = {
        userId,
        ownerId: userId,
        type: 'group',
        tripCode,
        memberIds: [userId],
        editorIds: [userId],
        members: [owner],
        name,
        location,
        status: 'active',
        defaultCurrency,
        createdAt: now,
        date: new Date().toLocaleDateString('es-CO', { month: 'short', year: 'numeric' }),
        image: DEFAULT_IMAGE,
        totalSpent: 0,
    };

    await setDoc(tripRef, tripData);
    return tripRef.id;
};

export const joinTripByCode = async (
    userId: string,
    displayName: string,
    rawCode: string
): Promise<string> => {
    const tripCode = rawCode.trim().toUpperCase();
    const q = query(
        collection(db, 'trips'),
        where('tripCode', '==', tripCode),
        where('status', '==', 'active'),
        limit(1)
    );
    const snap = await getDocs(q);
    if (snap.empty) {
        throw new Error('TRIP_NOT_FOUND');
    }
    const docSnap = snap.docs[0];
    return addMemberToTrip(docSnap.ref, docSnap.id, docSnap.data(), userId, displayName);
};

export const joinTripById = async (
    userId: string,
    displayName: string,
    tripId: string
): Promise<string> => {
    const tripRef = doc(db, 'trips', tripId.trim());
    const snap = await getDoc(tripRef);
    if (!snap.exists()) {
        throw new Error('TRIP_NOT_FOUND');
    }
    const data = snap.data();
    if (data.type !== 'group' || data.status !== 'active') {
        throw new Error('TRIP_NOT_FOUND');
    }
    return addMemberToTrip(tripRef, snap.id, data, userId, displayName);
};

async function addMemberToTrip(
    tripRef: ReturnType<typeof doc>,
    tripId: string,
    data: Record<string, unknown>,
    userId: string,
    displayName: string
): Promise<string> {
    const memberIds: string[] = (data.memberIds as string[]) || [];
    if (memberIds.includes(userId)) {
        return tripId;
    }

    const member: TripMember = {
        uid: userId,
        displayName,
        role: 'observer',
        joinedAt: new Date().toISOString(),
    };

    const members: TripMember[] = (data.members as TripMember[]) || [];

    await updateDoc(tripRef, {
        memberIds: arrayUnion(userId),
        members: [...members, member],
        updatedAt: serverTimestamp(),
    });

    // Activity log is secondary — never let it break a successful join.
    try {
        await logTripActivity(tripId, 'member_joined', { uid: userId, displayName });
    } catch (err) {
        console.error('Failed to log member_joined activity:', err);
    }
    return tripId;
}

export const updateMemberRole = async (
    tripId: string,
    memberUid: string,
    role: TripMemberRole
) => {
    const tripRef = doc(db, 'trips', tripId);
    const snap = await getDoc(tripRef);
    if (!snap.exists()) throw new Error('Trip not found');
    const members: TripMember[] = snap.data().members || [];
    const updated = members.map((m) => (m.uid === memberUid ? { ...m, role } : m));
    await updateDoc(tripRef, {
        members: updated,
        editorIds: editorIdsFromMembers(updated),
        updatedAt: serverTimestamp(),
    });
};

export function getMemberRole(trip: Trip | null, uid: string | undefined): TripMemberRole | null {
    if (!trip || !uid) return null;
    if (trip.ownerId === uid || trip.userId === uid) {
        const member = trip.members?.find((m) => m.uid === uid);
        return member?.role || 'owner';
    }
    const member = trip.members?.find((m) => m.uid === uid);
    return member?.role || null;
}

export function canEditTrip(trip: Trip | null, uid: string | undefined): boolean {
    const role = getMemberRole(trip, uid);
    return role === 'owner' || role === 'editor';
}

export const useActiveTrip = (userId: string | undefined, isOnline = true) => {
    const [trip, setTrip] = useState<Trip | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) {
            setLoading(false);
            return;
        }

        let unsubMember: (() => void) | undefined;
        let unsubLegacy: (() => void) | undefined;
        let memberTrip: Trip | null = null;
        let legacyTrip: Trip | null = null;

        const pickActive = () => {
            const chosen = memberTrip || legacyTrip;
            setTrip(chosen);
            setLoading(false);
        };

        const loadLocal = async () => {
            const localId = await getActiveTripIdLocal();
            if (localId) {
                const mirror = await getTripMirror(localId);
                if (mirror?.status === 'active') {
                    setTrip(mirror);
                }
            }
            if (!isOnline) setLoading(false);
        };

        loadLocal();

        if (!isOnline) return;

        const memberQ = query(
            collection(db, 'trips'),
            where('memberIds', 'array-contains', userId),
            where('status', '==', 'active'),
            orderBy('createdAt', 'desc'),
            limit(1)
        );

        const legacyQ = query(
            collection(db, 'trips'),
            where('userId', '==', userId),
            where('status', '==', 'active'),
            orderBy('createdAt', 'desc'),
            limit(1)
        );

        unsubMember = onSnapshot(
            memberQ,
            (snapshot) => {
                if (!snapshot.empty) {
                    const docSnap = snapshot.docs[0];
                    const data = docSnap.data();
                    maybeBackfillTrip(docSnap.id, data);
                    memberTrip = { id: docSnap.id, ...data, expenses: [] } as Trip;
                } else {
                    memberTrip = null;
                }
                pickActive();
            },
            async (err) => {
                console.error('Error fetching active trip (memberIds):', err);
                await loadLocal();
                setLoading(false);
            }
        );

        unsubLegacy = onSnapshot(
            legacyQ,
            (snapshot) => {
                if (!snapshot.empty) {
                    const docSnap = snapshot.docs[0];
                    const data = docSnap.data();
                    maybeBackfillTrip(docSnap.id, data);
                    legacyTrip = { id: docSnap.id, ...data, expenses: [] } as Trip;
                } else {
                    legacyTrip = null;
                }
                pickActive();
            },
            (err) => {
                console.error('Error fetching active trip (legacy):', err);
            }
        );

        return () => {
            unsubMember?.();
            unsubLegacy?.();
        };
    }, [userId, isOnline]);

    return { trip, loading };
};

export const useTrip = (tripId: string | undefined, isOnline = true) => {
    const [trip, setTrip] = useState<Trip | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!tripId) {
            setLoading(false);
            return;
        }

        const loadMirror = async () => {
            const mirror = await getTripMirror(tripId);
            if (mirror) setTrip(mirror);
            if (!isOnline) setLoading(false);
        };
        loadMirror();

        if (!isOnline) return;

        const tripRef = doc(db, 'trips', tripId);
        const unsubscribe = onSnapshot(
            tripRef,
            (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    maybeBackfillTrip(docSnap.id, data);
                    const next = { id: docSnap.id, ...data } as Trip;
                    setTrip(next);
                    void cacheTripMirror(next);
                } else {
                    getTripMirror(tripId).then((mirror) => setTrip(mirror));
                }
                setLoading(false);
            },
            (err) => {
                console.error('Error fetching trip detail:', err);
                getTripMirror(tripId).then((mirror) => {
                    setTrip(mirror);
                    setLoading(false);
                });
            }
        );

        return () => unsubscribe();
    }, [tripId, isOnline]);

    return { trip, loading };
};

function activityTimestampMs(raw: unknown): number {
    if (typeof raw === 'number') return raw;
    if (raw && typeof raw === 'object' && 'seconds' in raw) {
        return (raw as { seconds: number }).seconds * 1000;
    }
    if (raw && typeof raw === 'object' && 'toDate' in raw && typeof (raw as { toDate: () => Date }).toDate === 'function') {
        return (raw as { toDate: () => Date }).toDate().getTime();
    }
    return Date.now();
}

export async function logTripActivity(
    tripId: string,
    kind: TripActivityKind,
    actor: TripActivityActor,
    details?: {
        expenseId?: string;
        amountCOP?: number;
        note?: string;
        category?: ExpenseCategory;
        documentId?: string;
        documentName?: string;
    }
): Promise<void> {
    if (tripId.startsWith('local_')) return;
    await addDoc(collection(db, 'trips', tripId, 'activity'), {
        kind,
        actorUid: actor.uid,
        actorName: actor.displayName,
        ...stripUndefined(details ?? {}),
        createdAt: serverTimestamp(),
    });
}

export const addExpenseToTrip = async (
    tripId: string,
    expense: Expense,
    clientId?: string,
    actor?: TripActivityActor
): Promise<string> => {
    const expenseRef = clientId?.startsWith('temp_')
        ? doc(db, 'trips', tripId, 'expenses', clientId)
        : doc(collection(db, 'trips', tripId, 'expenses'));
    const tripRef = doc(db, 'trips', tripId);
    const now = serverTimestamp();

    const { id, pendingSync, localOnly, ...expenseData } = expense;

    await setDoc(expenseRef, {
        ...stripUndefined(expenseData),
        createdAt: now,
    });

    await updateDoc(tripRef, {
        totalSpent: increment(expense.amount),
        updatedAt: now,
    });

    if (actor) {
        await logTripActivity(tripId, 'expense_added', actor, {
            expenseId: expenseRef.id,
            amountCOP: expense.amount,
            note: expense.note,
            category: expense.category,
        });
    }

    if (expense.directCommunity?.injectionCop) {
        trackDirectEconomicInjection({
            amountCop: expense.directCommunity.injectionCop,
            refugioId: expense.directCommunity.refugioId,
            couponId: expense.directCommunity.couponId,
        });
    }

    return expenseRef.id;
};

export const deleteExpenseFromTrip = async (
    tripId: string,
    expenseId: string,
    amount: number,
    actor?: TripActivityActor,
    details?: { note?: string; category?: ExpenseCategory }
) => {
    const expenseRef = doc(db, 'trips', tripId, 'expenses', expenseId);
    const tripRef = doc(db, 'trips', tripId);

    await deleteDoc(expenseRef);

    await updateDoc(tripRef, {
        totalSpent: increment(-amount),
        updatedAt: serverTimestamp(),
    });

    if (actor) {
        await logTripActivity(tripId, 'expense_deleted', actor, {
            expenseId,
            amountCOP: amount,
            note: details?.note,
            category: details?.category,
        });
    }
};

export const finishTrip = async (tripId: string, totalSpent?: number, userId?: string) => {
    if (userId) {
        const completed = await countCompletedTripsForUser(userId);
        if (completed >= MAX_PAST_TRIPS) {
            throw new Error(TRIP_HISTORY_FULL);
        }
    }
    const tripRef = doc(db, 'trips', tripId);
    await updateDoc(tripRef, {
        status: 'completed',
        finishedAt: serverTimestamp(),
        totalSpent: totalSpent ?? 0,
    });
};

export const deleteTrip = async (tripId: string) => {
    const tripRef = doc(db, 'trips', tripId);
    await deleteDoc(tripRef);
};

async function countCompletedTripsForUser(userId: string): Promise<number> {
    const memberQ = query(
        collection(db, 'trips'),
        where('memberIds', 'array-contains', userId),
        where('status', '==', 'completed'),
        limit(MAX_PAST_TRIPS + 1)
    );
    const legacyQ = query(
        collection(db, 'trips'),
        where('userId', '==', userId),
        where('status', '==', 'completed'),
        limit(MAX_PAST_TRIPS + 1)
    );
    const [memberSnap, legacySnap] = await Promise.all([getDocs(memberQ), getDocs(legacyQ)]);
    const ids = new Set<string>();
    for (const d of memberSnap.docs) ids.add(d.id);
    for (const d of legacySnap.docs) ids.add(d.id);
    return ids.size;
}

export { MAX_PAST_TRIPS };

export const useTripExpenses = (tripId: string | undefined, isOnline = true) => {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);

    const mergeLocal = useCallback(async (remote: Expense[]) => {
        if (!tripId) return remote;
        const local = await getExpensesMirror(tripId);
        const pendingLocal = local.filter((e) => e.pendingSync || e.localOnly);
        const remoteIds = new Set(remote.map((e) => e.id));
        const merged = [
            ...pendingLocal.filter((e) => !remoteIds.has(e.id)),
            ...remote,
        ];
        return merged;
    }, [tripId]);

    useEffect(() => {
        if (!tripId) {
            setExpenses([]);
            setLoading(false);
            return;
        }

        const loadMirror = async () => {
            const mirror = await getExpensesMirror(tripId);
            if (mirror.length) setExpenses(mirror);
            if (!isOnline) setLoading(false);
        };
        loadMirror();

        if (!isOnline) return;

        const q = query(collection(db, 'trips', tripId, 'expenses'), orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(
            q,
            async (snapshot) => {
                const items = snapshot.docs.map((d) => ({
                    ...(d.data() as Omit<Expense, 'id'>),
                    id: d.id,
                }));
                const merged = await mergeLocal(items);
                setExpenses(merged);
                await cacheExpensesMirror(tripId, merged);
                setLoading(false);
            },
            async (err) => {
                console.error('Error fetching trip expenses:', err);
                const mirror = await getExpensesMirror(tripId);
                setExpenses(mirror);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [tripId, isOnline, mergeLocal]);

    return { expenses, loading };
};

const ACTIVITY_LIMIT = 40;

export const useTripActivity = (tripId: string | undefined, isOnline = true) => {
    const [activity, setActivity] = useState<TripActivityEntry[]>([]);
    const [loading, setLoading] = useState(true);

    const mergeLocal = useCallback(async (remote: TripActivityEntry[]) => {
        if (!tripId) return remote;
        const local = await getActivityMirror(tripId);
        const pendingLocal = local.filter((e) => e.pendingSync || e.localOnly);
        // Dedup by stable identity (kind + expenseId/actor), NOT createdAt:
        // the local optimistic timestamp never equals the server timestamp, so
        // including it would leave a duplicate after the expense syncs.
        const identity = (e: TripActivityEntry) => `${e.kind}:${e.expenseId ?? e.actorUid}`;
        const remoteKeys = new Set(remote.map(identity));
        const merged = [
            ...pendingLocal.filter((e) => !remoteKeys.has(identity(e))),
            ...remote,
        ];
        return merged.sort((a, b) => b.createdAt - a.createdAt).slice(0, ACTIVITY_LIMIT);
    }, [tripId]);

    useEffect(() => {
        if (!tripId) {
            setActivity([]);
            setLoading(false);
            return;
        }

        const loadMirror = async () => {
            const mirror = await getActivityMirror(tripId);
            if (mirror.length) setActivity(mirror.slice(0, ACTIVITY_LIMIT));
            if (!isOnline) setLoading(false);
        };
        void loadMirror();

        if (!isOnline || tripId.startsWith('local_')) {
            setLoading(false);
            return;
        }

        const q = query(
            collection(db, 'trips', tripId, 'activity'),
            orderBy('createdAt', 'desc'),
            limit(ACTIVITY_LIMIT)
        );

        const unsubscribe = onSnapshot(
            q,
            async (snapshot) => {
                const items: TripActivityEntry[] = snapshot.docs.map((d) => {
                    const data = d.data();
                    return {
                        id: d.id,
                        kind: data.kind as TripActivityKind,
                        actorUid: data.actorUid as string,
                        actorName: data.actorName as string,
                        createdAt: activityTimestampMs(data.createdAt),
                        expenseId: data.expenseId as string | undefined,
                        amountCOP: data.amountCOP as number | undefined,
                        note: data.note as string | undefined,
                        category: data.category as ExpenseCategory | undefined,
                    };
                });
                const merged = await mergeLocal(items);
                setActivity(merged);
                await cacheActivityMirror(tripId, merged);
                setLoading(false);
            },
            async (err) => {
                console.error('Error fetching trip activity:', err);
                const mirror = await getActivityMirror(tripId);
                setActivity(mirror.slice(0, ACTIVITY_LIMIT));
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [tripId, isOnline, mergeLocal]);

    return { activity, loading };
};

export const usePastTrips = (userId: string | undefined, isOnline = true) => {
    const [trips, setTrips] = useState<Trip[]>([]);
    const [loading, setLoading] = useState(true);
    const [fromCache, setFromCache] = useState(false);

    useEffect(() => {
        if (!userId) {
            setLoading(false);
            return;
        }

        let memberTrips: Trip[] = [];
        let legacyTrips: Trip[] = [];

        const applyMerged = async (source: 'remote' | 'cache') => {
            const byId = new Map<string, Trip>();
            for (const t of [...memberTrips, ...legacyTrips]) {
                byId.set(t.id, t);
            }
            const merged = Array.from(byId.values())
                .sort((a, b) => {
                    const aTime = (a as Trip & { createdAt?: { seconds: number } }).createdAt?.seconds || 0;
                    const bTime = (b as Trip & { createdAt?: { seconds: number } }).createdAt?.seconds || 0;
                    return bTime - aTime;
                })
                .slice(0, MAX_PAST_TRIPS);
            setTrips(merged);
            setFromCache(source === 'cache');
            if (source === 'remote' && merged.length > 0) {
                await cachePastTripsMirror(merged);
                await pruneCompletedTripsMirror(userId, new Set(merged.map((t) => t.id)));
            }
            setLoading(false);
        };

        const loadLocal = async () => {
            const mirror = await listCompletedTripsMirror(userId, MAX_PAST_TRIPS);
            if (mirror.length) {
                memberTrips = mirror;
                legacyTrips = [];
                await applyMerged('cache');
            } else if (!isOnline) {
                setTrips([]);
                setFromCache(true);
                setLoading(false);
            }
        };

        loadLocal();

        if (!isOnline) return;

        const memberQ = query(
            collection(db, 'trips'),
            where('memberIds', 'array-contains', userId),
            where('status', '==', 'completed'),
            orderBy('createdAt', 'desc'),
            limit(MAX_PAST_TRIPS)
        );

        const legacyQ = query(
            collection(db, 'trips'),
            where('userId', '==', userId),
            where('status', '==', 'completed'),
            orderBy('createdAt', 'desc'),
            limit(MAX_PAST_TRIPS)
        );

        const unsubMember = onSnapshot(
            memberQ,
            (snapshot) => {
                memberTrips = snapshot.docs.map((d) => {
                    const data = d.data();
                    maybeBackfillTrip(d.id, data);
                    return {
                        ...(data as Omit<Trip, 'id'>),
                        id: d.id,
                    };
                });
                void applyMerged('remote');
            },
            (err) => {
                console.error('Error fetching past trips (memberIds):', err);
                void loadLocal();
            }
        );

        const unsubLegacy = onSnapshot(
            legacyQ,
            (snapshot) => {
                legacyTrips = snapshot.docs.map((d) => {
                    const data = d.data();
                    maybeBackfillTrip(d.id, data);
                    return {
                        ...(data as Omit<Trip, 'id'>),
                        id: d.id,
                    };
                });
                void applyMerged('remote');
            },
            (err) => {
                console.error('Error fetching past trips (legacy):', err);
                void loadLocal();
            }
        );

        return () => {
            unsubMember();
            unsubLegacy();
        };
    }, [userId, isOnline]);

    return { trips, loading, fromCache };
};
