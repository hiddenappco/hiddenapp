import { useState, useEffect } from 'react';
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
    increment
} from 'firebase/firestore';
import { db } from '../services/firebase';

/**
 * Utility to create a new active trip
 */
export const createTrip = async (userId: string, name: string, location: string) => {
    const tripRef = doc(collection(db, 'trips'));
    const now = serverTimestamp();

    const tripData = {
        userId,
        name,
        location,
        status: 'active',
        createdAt: now,
        date: new Date().toLocaleDateString('es-CO', { month: 'short', year: 'numeric' }),
        image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBNhvg_gE0mA_8071n4_D0bdAERxgfIypflcDK22qUDNPyIT3eSxfl8s8feTtPIT3Dm7OZGcWr-dsgr8J35rvqO4W_hJdZkkKT8LTjjF-YC2u17XFEx3FuSPYoeVie9qCOxcXEKpN47z1g6DoW5ziJTFklUwipxT5ZHKR8RP591mT-J6SoUWbQi9vbURUu4aP9GvSbwY8Rz4Q4ezI9A9qVFQDfAeeAWrgqh2xyVq98uYHNG2ZfV_7rq_wWQYFkZ56Qs8zm4sbY_9hrw"
    };

    await setDoc(tripRef, tripData);
    return tripRef.id;
};

/**
 * Hook to listen to the user's current ACTIVE trip
 */
export const useActiveTrip = (userId: string | undefined) => {
    const [trip, setTrip] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) {
            setLoading(false);
            return;
        }

        const q = query(
            collection(db, 'trips'),
            where('userId', '==', userId),
            where('status', '==', 'active'),
            orderBy('createdAt', 'desc'),
            limit(1)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                const doc = snapshot.docs[0];
                setTrip({ id: doc.id, ...doc.data(), expenses: [] });
            } else {
                setTrip(null);
            }
            setLoading(false);
        }, (err) => {
            console.error("Error fetching active trip:", err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [userId]);

    return { trip, loading };
};

/**
 * Hook to listen to a SINGLE trip
 */
export const useTrip = (tripId: string | undefined) => {
    const [trip, setTrip] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!tripId) {
            setLoading(false);
            return;
        }

        const tripRef = doc(db, 'trips', tripId);
        const unsubscribe = onSnapshot(tripRef, (docSnap) => {
            if (docSnap.exists()) {
                setTrip({ id: docSnap.id, ...docSnap.data() });
            } else {
                setTrip(null);
            }
            setLoading(false);
        }, (err) => {
            console.error("Error fetching trip detail:", err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [tripId]);

    return { trip, loading };
};

/**
 * Utility to add an expense to a specific trip
 */
export const addExpenseToTrip = async (tripId: string, expense: any) => {
    const expenseRef = doc(collection(db, 'trips', tripId, 'expenses'));
    const tripRef = doc(db, 'trips', tripId);
    const now = serverTimestamp();

    const { id, ...expenseData } = expense;

    await setDoc(expenseRef, {
        ...expenseData,
        createdAt: now
    });

    await updateDoc(tripRef, {
        totalSpent: increment(expense.amount),
        updatedAt: now
    });
};

/**
 * Utility to delete an expense from a specific trip
 */
export const deleteExpenseFromTrip = async (tripId: string, expenseId: string, amount: number) => {
    const expenseRef = doc(db, 'trips', tripId, 'expenses', expenseId);
    const tripRef = doc(db, 'trips', tripId);

    await deleteDoc(expenseRef);

    await updateDoc(tripRef, {
        totalSpent: increment(-amount),
        updatedAt: serverTimestamp()
    });
};

/**
 * Utility to mark a trip as COMPLETED
 */
export const finishTrip = async (tripId: string, totalSpent?: number) => {
    const tripRef = doc(db, 'trips', tripId);
    await updateDoc(tripRef, {
        status: 'completed',
        finishedAt: serverTimestamp(),
        totalSpent: totalSpent ?? 0
    });
};

/**
 * Utility to delete a trip
 */
export const deleteTrip = async (tripId: string) => {
    const tripRef = doc(db, 'trips', tripId);
    await deleteDoc(tripRef);
};

/**
 * Hook to listen to a trip's expenses
 */
export const useTripExpenses = (tripId: string | undefined) => {
    const [expenses, setExpenses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!tripId) {
            setExpenses([]);
            setLoading(false);
            return;
        }

        const q = query(
            collection(db, 'trips', tripId, 'expenses'),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const items = snapshot.docs.map(doc => ({
                ...doc.data(),
                id: doc.id
            }));
            setExpenses(items);
            setLoading(false);
        }, (err) => {
            console.error("Error fetching trip expenses:", err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [tripId]);

    return { expenses, loading };
};

/**
 * Hook to listen to historical (completed) trips
 */
export const usePastTrips = (userId: string | undefined) => {
    const [trips, setTrips] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) {
            setLoading(false);
            return;
        }

        const q = query(
            collection(db, 'trips'),
            where('userId', '==', userId),
            where('status', '==', 'completed'),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const items = snapshot.docs.map(doc => ({
                ...doc.data(),
                id: doc.id
            }));
            setTrips(items);
            setLoading(false);
        }, (err) => {
            console.error("Error fetching past trips:", err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [userId]);

    return { trips, loading };
};
