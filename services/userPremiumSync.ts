import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { TRIP_PASS_DURATION_MS } from '../config/premiumLimits';
import { buildPremiumDurationPayload } from '../utils/premiumDuration';

export type GrantPremiumPlan = 'trip_pass' | 'monthly' | 'annual' | 'lifetime';

const PLAN_MS: Record<Exclude<GrantPremiumPlan, 'lifetime'>, number> = {
    trip_pass: TRIP_PASS_DURATION_MS,
    monthly: 30 * 24 * 60 * 60 * 1000,
    annual: 365 * 24 * 60 * 60 * 1000,
};

/**
 * Grants Premium in Firestore.
 * Empty `premiumExpiresAt` = no expiry. Duration is set only for timed plans.
 */
export async function grantPremiumInFirestore(
    uid: string,
    plan: GrantPremiumPlan = 'lifetime'
): Promise<void> {
    const payload: Record<string, unknown> = { isPremium: true, premiumPlan: plan };
    if (plan !== 'lifetime') {
        const start = new Date();
        const end = new Date(start.getTime() + PLAN_MS[plan]);
        payload.premiumExpiresAt = buildPremiumDurationPayload(start, end);
    }
    await setDoc(doc(db, 'users', uid), payload, { merge: true });
}
