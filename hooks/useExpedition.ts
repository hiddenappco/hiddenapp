import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';

export type ExpeditionStatus =
    | 'queued'
    | 'curating'
    | 'routing'
    | 'budgeting'
    | 'writing'
    | 'ready'
    | 'error';

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

export interface ExpeditionDayCoupon {
    id: string;
    isPremium?: boolean;
    title?: string;
    discount?: string;
}

export interface ExpeditionDay {
    day: number;
    title: string;
    stops: ExpeditionStop[];
    refugio: { id: string; name: string } | null;
    refugioNote: string;
    tips: string;
    coupons?: ExpeditionDayCoupon[];
}

export interface ExpeditionWidgetRef {
    type: 'coupon';
    id: string;
    day: number;
    isPremium?: boolean;
}

export interface BudgetBreakdownLine {
    min: number;
    max: number;
    note: string;
}

export interface ExpeditionBudgetEstimate {
    currency: 'COP';
    totalMin: number;
    totalMax: number;
    perPersonMin?: number;
    perPersonMax?: number;
    breakdown: {
        transport: BudgetBreakdownLine;
        lodging: BudgetBreakdownLine;
        activities: BudgetBreakdownLine;
        food: BudgetBreakdownLine;
        contingency: BudgetBreakdownLine;
    };
    assumptions: string[];
    narrative: string;
    confidence: 'high' | 'medium' | 'low';
}

export interface ExpeditionTravelContext {
    groundMobility?: 'private_vehicle' | 'public_transport' | 'mixed';
    originLabel?: string;
    pace?: string;
}

export interface ExpeditionItinerary {
    title: string;
    summary: string;
    days: ExpeditionDay[];
    packing: string;
    curatorNote: string;
    travelContext?: ExpeditionTravelContext;
    budgetEstimate?: ExpeditionBudgetEstimate;
    validationNote?: string;
    widgets?: ExpeditionWidgetRef[];
    departmentCoupons?: ExpeditionDayCoupon[];
}

export interface ExpeditionRequest {
    days: number;
    origin?: { label: string; lat?: number | null; lng?: number | null };
    pace?: string;
    budgetMode?: string;
    interests?: string[];
    travelerProfile?: string;
    mustVisitDestinationIds?: string[];
    groundMobility?: 'private_vehicle' | 'public_transport' | 'mixed';
}

export interface Expedition {
    id: string;
    status: ExpeditionStatus;
    departmentId: string;
    error?: string;
    note?: string;
    itinerary?: ExpeditionItinerary;
    request?: ExpeditionRequest;
    pdfUrl?: string;
    pdfExpiresAt?: { toDate?: () => Date } | string | Date;
}

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
