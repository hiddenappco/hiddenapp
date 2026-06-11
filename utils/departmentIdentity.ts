/** Canonical department id for aggregating Firestore rows (valle ↔ valle-del-cauca). */
export function canonicalDepartmentId(departmentId: string): string {
    if (departmentId === 'valle') return 'valle-del-cauca';
    return departmentId;
}

/** All keys that may identify a department card in the UI. */
export function departmentLookupKeys(dept: { id: string; departmentId?: string }): string[] {
    const keys = new Set<string>();
    if (dept.id) keys.add(canonicalDepartmentId(dept.id));
    if (dept.departmentId) keys.add(canonicalDepartmentId(dept.departmentId));
    return [...keys];
}

export function resolveDestinationCount(
    counts: Record<string, number>,
    dept: { id: string; departmentId?: string }
): number {
    let total = 0;
    for (const key of departmentLookupKeys(dept)) {
        total = Math.max(total, counts[key] ?? 0);
    }
    return total;
}

/** Strip redundant "Prom." suffix when the UI already shows an average label. */
export function formatDepartmentStatValue(value?: string | null): string {
    return String(value ?? '')
        .replace(/\s*(Prom\.?|Avg\.?|Average|Promedio)\.?\s*$/i, '')
        .trim();
}
