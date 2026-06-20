import { useCallback, useEffect, useState } from 'react';

export type FeatureTooltipId = 'vault' | 'ranger' | 'live' | 'hub';

export const FEATURE_TOOLTIP_IDS: FeatureTooltipId[] = ['vault', 'ranger', 'live', 'hub'];

const STORAGE_PREFIX = 'hidden_tooltip_';

function storageKey(id: FeatureTooltipId): string {
    return `${STORAGE_PREFIX}${id}_v1`;
}

/** Clears all one-time coach mark dismiss flags so tips show again on next visit. */
export function resetAllFeatureTooltips(): void {
    for (const id of FEATURE_TOOLTIP_IDS) {
        try {
            localStorage.removeItem(storageKey(id));
        } catch {
            /* private mode */
        }
    }
}

export function useFeatureTooltip(id: FeatureTooltipId) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        try {
            if (!localStorage.getItem(storageKey(id))) {
                setVisible(true);
            }
        } catch {
            /* private mode */
        }
    }, [id]);

    const dismiss = useCallback(() => {
        try {
            localStorage.setItem(storageKey(id), '1');
        } catch {
            /* ignore */
        }
        setVisible(false);
    }, [id]);

    return { visible, dismiss };
}
