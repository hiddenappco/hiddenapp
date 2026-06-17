import { API_ENDPOINTS } from '../config/constants';
import { getAuthHeaders } from './authHeaders';

/**
 * Reports elapsed Live-call seconds to the server, which verifies the Firebase
 * ID token and accounts usage with the Admin SDK. The client no longer writes
 * `liveCallUsage` directly, so quota cannot be tampered with from the device.
 * `userId` is kept in the signature for call-site compatibility but the server
 * derives the real UID from the token.
 */
export async function addLiveCallSeconds(userId: string, seconds: number): Promise<void> {
    const delta = Math.max(0, Math.floor(seconds));
    if (!userId || delta === 0) return;

    const res = await fetch(API_ENDPOINTS.RECORD_LIVE_CALL_SECONDS, {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ seconds: delta }),
    });

    if (!res.ok) {
        throw new Error(`RECORD_LIVE_CALL_FAILED_${res.status}`);
    }
}
