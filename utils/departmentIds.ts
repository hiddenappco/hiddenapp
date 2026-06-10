/**
 * Resolves route/context ids (Firestore doc id or slug) to the canonical department slug.
 */

/** @deprecated Remove after Firestore doc ids are migrated to slugs */
const LEGACY_DOC_ID_TO_SLUG: Record<string, string> = {
    zzzzzzzzzzzzzzzzzzzy: 'valle-del-cauca',
    zzzzzzzzzzzzzzzzzzzx: 'amazonas',
};

export function getAssistantDocId(canonicalDepartmentId: string): string {
    return canonicalDepartmentId === 'valle-del-cauca' ? 'valle' : canonicalDepartmentId;
}

export function resolveEffectiveDepartmentId(
    contextOrDocId: string | undefined,
    department?: { departmentId?: string } | null
): string {
    if (!contextOrDocId) return '';
    if (department?.departmentId?.trim()) return department.departmentId.trim();
    return LEGACY_DOC_ID_TO_SLUG[contextOrDocId] || contextOrDocId;
}
