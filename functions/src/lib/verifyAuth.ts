import { adminAuth } from '../config/firebase';

export class AuthError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'AuthError';
    }
}

export async function requireAuthUid(req: { headers: Record<string, unknown> }): Promise<string> {
    const raw = req.headers.authorization ?? req.headers.Authorization;
    if (typeof raw !== 'string' || !raw.startsWith('Bearer ')) {
        throw new AuthError('Missing authorization token');
    }
    const decoded = await adminAuth.verifyIdToken(raw.slice(7));
    return decoded.uid;
}
