import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getAuth } from 'firebase-admin/auth';
import { db } from '../config/firebase';
import { hasActivePremium } from '../lib/premiumAccess';

const INACTIVE_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Deletes anonymous guest accounts inactive for 30+ days.
 * `isPremium` is the single source of truth for every account: a guest with
 * an active Premium (paid or admin-granted) is never auto-deleted here.
 */
export const scheduledGuestCleanup = onSchedule(
    {
        schedule: '0 5 * * *',
        timeZone: 'America/Bogota',
    },
    async () => {
        const cutoff = Date.now() - INACTIVE_MS;
        let deleted = 0;
        let scanned = 0;
        let nextPageToken: string | undefined;

        do {
            const page = await getAuth().listUsers(1000, nextPageToken);
            for (const user of page.users) {
                scanned += 1;
                // Anonymous (guest) users have NO linked providers. A user who upgraded
                // their guest account has provider entries and must never be deleted here.
                if (user.providerData.length > 0) continue;

                const userDoc = await db.collection('users').doc(user.uid).get();
                const data = userDoc.data();
                if (data?.isGuest !== true) continue;
                if (hasActivePremium(data)) continue;

                const lastActiveRaw = data?.lastActiveAt;
                let lastActiveMs = new Date(user.metadata.lastSignInTime).getTime();
                if (typeof lastActiveRaw === 'string') {
                    const parsed = Date.parse(lastActiveRaw);
                    if (Number.isFinite(parsed)) lastActiveMs = Math.max(lastActiveMs, parsed);
                } else if (
                    lastActiveRaw &&
                    typeof lastActiveRaw === 'object' &&
                    'toDate' in lastActiveRaw &&
                    typeof (lastActiveRaw as { toDate: () => Date }).toDate === 'function'
                ) {
                    lastActiveMs = Math.max(
                        lastActiveMs,
                        (lastActiveRaw as { toDate: () => Date }).toDate().getTime()
                    );
                }

                if (lastActiveMs >= cutoff) continue;

                await getAuth().deleteUser(user.uid);
                if (userDoc.exists) {
                    await userDoc.ref.delete();
                }
                deleted += 1;
            }
            nextPageToken = page.pageToken;
        } while (nextPageToken);

        console.log(`[scheduledGuestCleanup] scanned=${scanned} deleted=${deleted}`);
    }
);
