import type { AppLanguage } from '../chat/briefing';

export type ExpeditionPace = 'relaxed' | 'balanced' | 'intense';
export type BudgetMode = 'fixed' | 'range' | 'open';
export type TravelerProfile = 'solo' | 'couple' | 'family' | 'group';
export type AccommodationPreference = 'refugio_hidden' | 'mixed' | 'own_lodging';

/** How the traveler moves between cities/hubs — drives schedule feasibility. */
export type GroundMobility = 'private_vehicle' | 'public_transport' | 'mixed';

export const GROUND_MOBILITY_VALUES: GroundMobility[] = [
    'private_vehicle',
    'public_transport',
    'mixed',
];

export interface ExpeditionOrigin {
    label: string;
    lat?: number | null;
    lng?: number | null;
}

export interface ExpeditionTravelDates {
    start: string;
    end: string;
}

export interface ExpeditionBudget {
    amountCOP?: number | null;
    minCOP?: number | null;
    maxCOP?: number | null;
}

export interface ExpeditionRequest {
    days: number;
    origin: ExpeditionOrigin;
    travelDates?: ExpeditionTravelDates;
    pace: ExpeditionPace;
    budgetMode: BudgetMode;
    budget: ExpeditionBudget;
    interests: string[];
    travelerProfile: TravelerProfile;
    groupSize?: number;
    mustVisitDestinationIds?: string[];
    avoidDestinationIds?: string[];
    destinationTypeFilter?: string[];
    accommodationPreference?: AccommodationPreference;
    /** Primary ground transport mode for inter-city / hub legs. */
    groundMobility?: GroundMobility;
    transportConstraints?: string[];
    maxStopsPerDay?: number;
    accessibilityNotes?: string;
    /** Free-form traveler intent: pace, few vs many places, priorities */
    travelerNotes?: string;
    /** @deprecated legacy chat tool */
    originLabel?: string;
    originLat?: number | null;
    originLng?: number | null;
    budget_legacy?: string;
}

export interface ExpeditionDoc {
    userId: string;
    departmentId: string;
    language: AppLanguage;
    request: ExpeditionRequest;
    status: string;
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
