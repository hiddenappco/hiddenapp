import { onRequest } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "../config/firebase";

interface TripBackfillReport {
    scanned: number;
    needsBackfill: number;
    backfilled: number;
    sampleIds: string[];
    dryRun: boolean;
}

function needsMemberBackfill(data: Record<string, unknown>): boolean {
    const memberIds = data.memberIds;
    const hasMembers = Array.isArray(memberIds) && memberIds.length > 0;
    if (hasMembers) return false;
    const ownerId = String(data.ownerId || data.userId || "").trim();
    return Boolean(ownerId);
}

/**
 * Verifies / backfills legacy trips missing `memberIds` / `editorIds`.
 * GET `?dryRun=1` (default) — report only.
 * GET `?dryRun=0` — apply patches (admin use).
 */
export const verifyTripMemberBackfill = onRequest(async (req, res) => {
    const dryRun = req.query.dryRun !== "0";
    const report: TripBackfillReport = {
        scanned: 0,
        needsBackfill: 0,
        backfilled: 0,
        sampleIds: [],
        dryRun,
    };

    const snap = await db.collection("trips").get();
    report.scanned = snap.size;

    let batch = db.batch();
    let batchCount = 0;

    const commitBatch = async () => {
        if (batchCount > 0) {
            await batch.commit();
            batch = db.batch();
            batchCount = 0;
        }
    };

    for (const docSnap of snap.docs) {
        const data = docSnap.data() as Record<string, unknown>;
        if (!needsMemberBackfill(data)) continue;

        report.needsBackfill += 1;
        if (report.sampleIds.length < 10) {
            report.sampleIds.push(docSnap.id);
        }

        if (dryRun) continue;

        const ownerId = String(data.ownerId || data.userId);
        const members = Array.isArray(data.members) ? data.members : [];
        const editorIds = members
            .filter((m: { role?: string }) => m?.role === "owner" || m?.role === "editor")
            .map((m: { uid?: string }) => m.uid)
            .filter(Boolean) as string[];

        batch.update(docSnap.ref, {
            memberIds: [ownerId],
            editorIds: editorIds.length > 0 ? editorIds : [ownerId],
            backfilledAt: FieldValue.serverTimestamp(),
        });
        batchCount += 1;
        report.backfilled += 1;

        if (batchCount >= 400) {
            await commitBatch();
        }
    }

    await commitBatch();

    res.json(report);
});
