import { db } from './firebase';
import { doc, updateDoc } from 'firebase/firestore';

/** Duración máxima del escudo activo (12 h). */
export const SHIELD_DURATION_MS = 12 * 60 * 60 * 1000;

export interface ActiveMonitorState {
    destinationId: string | null;
    isActive: boolean;
    updatedAt: Date;
    expiresAt: Date | null;
}

export function buildActiveMonitorPayload(
    destinationId: string | null,
    isActive: boolean,
    existingExpiresAt?: Date | null
): ActiveMonitorState {
    const now = new Date();
    return {
        destinationId: isActive ? destinationId : null,
        isActive,
        updatedAt: now,
        expiresAt: isActive
            ? existingExpiresAt && existingExpiresAt.getTime() > now.getTime()
                ? existingExpiresAt
                : new Date(now.getTime() + SHIELD_DURATION_MS)
            : null,
    };
}

/** Escudo ON sin destino (usuario pulsó X para cambiar zona). */
export function buildShieldAwaitingDestinationPayload(
    existingExpiresAt?: Date | null
): ActiveMonitorState {
    return buildActiveMonitorPayload(null, true, existingExpiresAt);
}

/** Apaga escudo y campos legacy usados por el cron de alertas. */
export async function deactivateEnvironmentalShield(userId: string): Promise<void> {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
        activeMonitor: {
            destinationId: null,
            isActive: false,
            updatedAt: new Date(),
            expiresAt: null,
        },
        earlyAlert: false,
        activeDestinationId: null,
    });
}

export function isShieldExpired(expiresAt: unknown): boolean {
    if (!expiresAt) return false;
    try {
        const date =
            typeof (expiresAt as { toDate?: () => Date }).toDate === 'function'
                ? (expiresAt as { toDate: () => Date }).toDate()
                : new Date(expiresAt as string | number);
        return !isNaN(date.getTime()) && date.getTime() < Date.now();
    } catch {
        return false;
    }
}
