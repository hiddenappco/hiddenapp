import { auth } from './firebase';

export async function getAuthHeaders(
    extra: Record<string, string> = {}
): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...extra,
    };
    const user = auth.currentUser;
    if (user) {
        headers.Authorization = `Bearer ${await user.getIdToken()}`;
    }
    return headers;
}
