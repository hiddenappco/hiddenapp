import { useCallback, useEffect, useState } from 'react';

export type FeatureTooltipId = 'vault' | 'ranger' | 'live' | 'hub';

const STORAGE_PREFIX = 'hidden_tooltip_';

function storageKey(id: FeatureTooltipId): string {
    return `${STORAGE_PREFIX}${id}_v1`;
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
