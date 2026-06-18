import { API_ENDPOINTS } from '../config/constants';
import { getAuthHeaders } from '../services/authHeaders';

export type ExpeditionPace = 'relaxed' | 'balanced' | 'intense';
export type BudgetMode = 'fixed' | 'range' | 'open';
export type TravelerProfile = 'solo' | 'couple' | 'family' | 'group';
export type GroundMobility = 'private_vehicle' | 'public_transport' | 'mixed';

export interface CreateExpeditionPayload {
    departmentId: string;
    language: 'es' | 'en';
    request: {
        days: number;
        origin: { label: string; lat?: number | null; lng?: number | null };
        travelDates?: { start: string; end: string };
        pace: ExpeditionPace;
        budgetMode: BudgetMode;
        budget: { amountCOP?: number | null; minCOP?: number | null; maxCOP?: number | null };
        interests: string[];
        travelerProfile: TravelerProfile;
        groupSize?: number;
        mustVisitDestinationIds?: string[];
        groundMobility?: GroundMobility;
        transportConstraints?: string[];
        maxStopsPerDay?: number;
        travelerNotes?: string;
    };
    parentExpeditionId?: string;
    revisionNotes?: string;
}

async function postCreateExpedition(payload: CreateExpeditionPayload): Promise<{ expeditionId: string }> {
    const response = await fetch(API_ENDPOINTS.CREATE_EXPEDITION, {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'CREATE_EXPEDITION_FAILED');
    }

    const data = await response.json();
    if (!data.expeditionId) throw new Error('MISSING_EXPEDITION_ID');
    return { expeditionId: data.expeditionId };
}

export async function createExpedition(payload: CreateExpeditionPayload): Promise<{ expeditionId: string }> {
    return postCreateExpedition(payload);
}

export async function reviseExpedition(
    parentExpeditionId: string,
    departmentId: string,
    language: 'es' | 'en',
    revisionNotes: string,
    request: CreateExpeditionPayload['request']
): Promise<{ expeditionId: string }> {
    return postCreateExpedition({
        departmentId,
        language,
        parentExpeditionId,
        revisionNotes,
        request,
    });
}
