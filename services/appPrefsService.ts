import { updateUserProfile } from '../hooks/useSocial';
import type { AppPrefs } from '../types/social';

/** Persist app-wide preferences to Firestore (localStorage remains primary for offline). */
export async function updateAppPrefs(
    userId: string,
    partial: Partial<AppPrefs>,
    current?: AppPrefs | null
): Promise<void> {
    await updateUserProfile(userId, {
        appPrefs: {
            ...(current ?? {}),
            ...partial,
            updatedAt: new Date().toISOString(),
        },
    });
}
