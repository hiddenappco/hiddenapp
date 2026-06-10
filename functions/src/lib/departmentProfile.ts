import type { DocumentData, Firestore } from "firebase-admin/firestore";

/** Firestore doc id for assistants (Valle uses short key "valle") */
export function getAssistantDocId(canonicalDepartmentId: string): string {
    return canonicalDepartmentId === "valle-del-cauca" ? "valle" : canonicalDepartmentId;
}

/** Same departmentId variants used across destinations / coupons queries */
export function expandDepartmentKbIds(departmentId: string): string[] {
    const kbIds = [departmentId];
    if (departmentId === "valle" && !kbIds.includes("valle-del-cauca")) kbIds.push("valle-del-cauca");
    if (departmentId === "valle-del-cauca" && !kbIds.includes("valle")) kbIds.push("valle");
    return [...new Set(kbIds)];
}

const DEPARTMENT_AGENT_FIELDS = [
    "departmentId",
    "name",
    "subtitle",
    "tag",
    "locationLabel",
    "description",
    "temp",
    "humidity",
    "safetyNote",
    "logistics",
    "seasonality",
    "ecosystems",
    "mustTryGastronomy",
    "tips",
    "status",
    // Optional extended briefing fields (Rowy / Tarea 20)
    "geography",
    "geographicInfo",
    "culture",
    "culturalInfo",
    "history",
    "historyInfo",
    "generalInfo",
] as const;

function pickDepartmentFields(data: DocumentData): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const key of DEPARTMENT_AGENT_FIELDS) {
        if (data[key] !== undefined && data[key] !== null && data[key] !== "") {
            out[key] = data[key];
        }
    }
    return out;
}

/**
 * Loads the parent department document (departments collection) for hyperlocal agents.
 * Resolves by Firestore doc id and by the departmentId field (slug).
 */
export async function fetchDepartmentProfile(
    db: Firestore,
    departmentId: string
): Promise<Record<string, unknown> | null> {
    const kbIds = expandDepartmentKbIds(departmentId);
    const docIdCandidates = [...new Set([
        departmentId,
        departmentId === "valle-del-cauca" ? "valle" : departmentId,
        ...kbIds,
    ])];

    for (const id of docIdCandidates) {
        const snap = await db.collection("departments").doc(id).get();
        if (snap.exists) {
            return { id: snap.id, ...pickDepartmentFields(snap.data()!) };
        }
    }

    for (const kid of kbIds) {
        const query = await db.collection("departments")
            .where("departmentId", "==", kid)
            .limit(1)
            .get();
        if (!query.empty) {
            const doc = query.docs[0];
            return { id: doc.id, ...pickDepartmentFields(doc.data()) };
        }
    }

    return null;
}

export interface ResolvedDepartmentContext {
    /** Slug used in destinations/Coupons/Events (departmentId field) */
    canonicalId: string;
    profile: Record<string, unknown> | null;
    assistantDocId: string;
    kbIds: string[];
}

/**
 * Resolves incoming route/body id (Firestore doc id or slug) to a canonical department slug
 * for KB queries and assistant lookup.
 */
export async function resolveDepartmentContext(
    db: Firestore,
    incomingId: string
): Promise<ResolvedDepartmentContext> {
    const profile = await fetchDepartmentProfile(db, incomingId);
    const canonicalId =
        (typeof profile?.departmentId === "string" && profile.departmentId.trim())
            ? profile.departmentId.trim()
            : incomingId;

    const assistantDocId = getAssistantDocId(canonicalId);
    const kbIds = expandDepartmentKbIds(canonicalId);

    return { canonicalId, profile, assistantDocId, kbIds };
}
