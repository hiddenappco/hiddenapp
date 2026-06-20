import type { Firestore } from "firebase-admin/firestore";
import { EXPEDITION_HISTORY_LIMIT } from "./premiumLimits";

export class ExpeditionHistoryFullError extends Error {
    constructor() {
        super("EXPEDITION_HISTORY_FULL");
        this.name = "ExpeditionHistoryFullError";
    }
}

/** Blocks new plans when the user already has `EXPEDITION_HISTORY_LIMIT` saved expeditions. */
export async function assertUserExpeditionHistoryCapacity(db: Firestore, userId: string): Promise<void> {
    const snapshot = await db
        .collection("expeditions")
        .where("userId", "==", userId)
        .limit(EXPEDITION_HISTORY_LIMIT)
        .get();

    if (snapshot.size >= EXPEDITION_HISTORY_LIMIT) {
        throw new ExpeditionHistoryFullError();
    }
}
