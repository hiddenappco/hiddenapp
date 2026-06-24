const STORAGE_PREFIX = 'hidden_packing_checked_v1';

function storageKey(destinationId: string): string {
    return `${STORAGE_PREFIX}:${destinationId}`;
}

/**
 * Stable per-item key. Uses category + item index (not the localized name) so a
 * checked item survives an ES↔EN language switch, as long as the editorial
 * ES/EN packing arrays stay parallel.
 */
export function packingItemKey(categoryIndex: number, itemIndex: number): string {
    return `${categoryIndex}:${itemIndex}`;
}

export function readPackingChecked(destinationId: string): Set<string> {
    if (!destinationId || typeof localStorage === 'undefined') return new Set();
    try {
        const raw = localStorage.getItem(storageKey(destinationId));
        if (!raw) return new Set();
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) return new Set();
        return new Set(parsed.filter((k) => typeof k === 'string'));
    } catch {
        return new Set();
    }
}

export function writePackingChecked(destinationId: string, keys: Set<string>): void {
    if (!destinationId || typeof localStorage === 'undefined') return;
    try {
        localStorage.setItem(storageKey(destinationId), JSON.stringify([...keys]));
    } catch {
        /* quota / private mode */
    }
}

export function togglePackingItem(
    destinationId: string,
    itemKey: string,
    checked: boolean
): Set<string> {
    const next = readPackingChecked(destinationId);
    if (checked) next.add(itemKey);
    else next.delete(itemKey);
    writePackingChecked(destinationId, next);
    return next;
}
