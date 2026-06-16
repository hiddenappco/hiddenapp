import { resolveEffectiveDepartmentId } from './departmentIds';

/** Department slugs where the expedition planner is disabled (catalog too thin). */
export const EXPEDITION_PLANNER_LOCKED_SLUGS = ['amazonas'] as const;

export function isExpeditionPlannerLocked(
    contextOrDocId: string | undefined,
    department?: { departmentId?: string } | null
): boolean {
    const slug = resolveEffectiveDepartmentId(contextOrDocId, department);
    return (EXPEDITION_PLANNER_LOCKED_SLUGS as readonly string[]).includes(slug);
}
