import { useEffect, useState } from 'react';
import { collection, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { db } from '../services/firebase';
import { EXPEDITION_HISTORY_LIMIT } from '../config/constants';
import type { Expedition, ExpeditionStatus } from './useExpedition';

export type UserExpeditionSummary = Pick<
    Expedition,
    | 'id'
    | 'status'
    | 'departmentId'
    | 'language'
    | 'request'
    | 'itinerary'
    | 'parentExpeditionId'
    | 'error'
> & {
    createdAt?: Date;
};

function parseCreatedAt(raw: unknown): Date | undefined {
    if (!raw) return undefined;
    if (typeof raw === 'object' && raw !== null && 'toDate' in raw) {
        const d = (raw as { toDate: () => Date }).toDate();
        return Number.isNaN(d.getTime()) ? undefined : d;
    }
    const d = new Date(raw as string | number | Date);
    return Number.isNaN(d.getTime()) ? undefined : d;
}

export function useUserExpeditions(userId: string | undefined) {
    const [data, setData] = useState<UserExpeditionSummary[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) {
            setData([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        const q = query(
            collection(db, 'expeditions'),
            where('userId', '==', userId),
            orderBy('createdAt', 'desc'),
            limit(EXPEDITION_HISTORY_LIMIT)
        );

        const unsubscribe = onSnapshot(
            q,
            (snap) => {
                const rows: UserExpeditionSummary[] = snap.docs.map((doc) => {
                    const raw = doc.data();
                    return {
                        id: doc.id,
                        status: raw.status as ExpeditionStatus,
                        departmentId: String(raw.departmentId || ''),
                        language: raw.language as 'es' | 'en' | undefined,
                        request: raw.request as Expedition['request'],
                        itinerary: raw.itinerary as Expedition['itinerary'],
                        parentExpeditionId: raw.parentExpeditionId as string | null | undefined,
                        error: raw.error as string | undefined,
                        createdAt: parseCreatedAt(raw.createdAt),
                    };
                });
                setData(rows);
                setLoading(false);
            },
            (err) => {
                console.error('[useUserExpeditions] snapshot error:', err);
                setData([]);
                setLoading(false);
            }
        );

        return unsubscribe;
    }, [userId]);

    return { data, loading };
}
