import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';

export type ExpeditionStatus = 'queued' | 'curating' | 'routing' | 'writing' | 'ready' | 'error';

export interface ExpeditionTravel {
    durationText: string;
    distanceText: string;
}

export interface ExpeditionStop {
    destinationId: string;
    name: string;
    plan: string;
    travel: ExpeditionTravel | null;
}

export interface ExpeditionDay {
    day: number;
    title: string;
    stops: ExpeditionStop[];
    refugio: { id: string; name: string } | null;
    refugioNote: string;
    tips: string;
}

export interface ExpeditionItinerary {
    title: string;
    summary: string;
    days: ExpeditionDay[];
    packing: string;
    curatorNote: string;
}

export interface Expedition {
    id: string;
    status: ExpeditionStatus;
    departmentId: string;
    error?: string;
    note?: string;
    itinerary?: ExpeditionItinerary;
    request?: { days: number; interests?: string[] };
}

/** Live subscription to an expedition doc so the chat widget shows pipeline progress in real time. */
export const useExpedition = (id: string | undefined) => {
    const [data, setData] = useState<Expedition | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) {
            setData(null);
            setLoading(false);
            return;
        }
        setLoading(true);
        const unsubscribe = onSnapshot(
            doc(db, 'expeditions', id),
            (snap) => {
                if (snap.exists()) {
                    setData({ id: snap.id, ...(snap.data() as Omit<Expedition, 'id'>) });
                } else {
                    setData(null);
                }
                setLoading(false);
            },
            (err) => {
                console.error('[useExpedition] snapshot error:', err);
                setData(null);
                setLoading(false);
            }
        );
        return unsubscribe;
    }, [id]);

    return { data, loading };
};
