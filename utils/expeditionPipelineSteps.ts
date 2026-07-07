import type { ExpeditionStatus } from '../hooks/useExpedition';

export const EXPEDITION_PIPELINE_STEPS = [
    { key: 'curating' as const, icon: 'psychology', labelKey: 'expedition.agentCurator' },
    { key: 'routing' as const, icon: 'route', labelKey: 'expedition.agentLogistics' },
    { key: 'budgeting' as const, icon: 'payments', labelKey: 'expedition.agentBudget' },
    { key: 'writing' as const, icon: 'edit_note', labelKey: 'expedition.agentWriter' },
] as const;

export const EXPEDITION_STATUS_ORDER: ExpeditionStatus[] = [
    'queued',
    'curating',
    'routing',
    'budgeting',
    'writing',
    'ready',
];

export function expeditionStatusIndex(status: ExpeditionStatus): number {
    const i = EXPEDITION_STATUS_ORDER.indexOf(status);
    return i < 0 ? 0 : i;
}

/** Short pipeline labels for the skeleton status strip (P1-OFF-04). */
export const EXPEDITION_SKELETON_STRIP = [
    { statusKeys: ['queued', 'curating'] as ExpeditionStatus[], labelKey: 'expedition.skeletonStripCurating' },
    { statusKeys: ['routing', 'budgeting'] as ExpeditionStatus[], labelKey: 'expedition.skeletonStripLogistics' },
    { statusKeys: ['writing'] as ExpeditionStatus[], labelKey: 'expedition.skeletonStripWriting' },
] as const;

export function skeletonStripIndex(status: ExpeditionStatus): number {
    const idx = EXPEDITION_SKELETON_STRIP.findIndex((s) => s.statusKeys.includes(status));
    return idx < 0 ? 0 : idx;
}
