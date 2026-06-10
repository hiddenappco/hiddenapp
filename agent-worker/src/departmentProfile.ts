import type { DocumentData, Firestore } from "firebase-admin/firestore";

export function getAssistantDocId(canonicalDepartmentId: string): string {
    return canonicalDepartmentId === "valle-del-cauca" ? "valle" : canonicalDepartmentId;
}

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
