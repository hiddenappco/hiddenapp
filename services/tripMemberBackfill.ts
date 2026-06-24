import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

export function tripNeedsMemberBackfill(data: Record<string, unknown>): boolean {
    const memberIds = data.memberIds;
    if (Array.isArray(memberIds) && memberIds.length > 0) return false;
    return Boolean(String(data.ownerId || data.userId || '').trim());
}

/** Lazy backfill for legacy trips missing `memberIds` / `editorIds`. */
export async function backfillTripMemberIds(
    tripId: string,
    data: Record<string, unknown>
): Promise<void> {
    if (!tripNeedsMemberBackfill(data) || tripId.startsWith('local_')) return;

    const ownerId = String(data.ownerId || data.userId);
    const members = Array.isArray(data.members)
        ? (data.members as { role?: string; uid?: string }[])
        : [];
    const editorIds = members
        .filter((m) => m?.role === 'owner' || m?.role === 'editor')
        .map((m) => m.uid)
        .filter(Boolean) as string[];

    await updateDoc(doc(db, 'trips', tripId), {
        memberIds: [ownerId],
        editorIds: editorIds.length > 0 ? editorIds : [ownerId],
        backfilledAt: serverTimestamp(),
    });
}
