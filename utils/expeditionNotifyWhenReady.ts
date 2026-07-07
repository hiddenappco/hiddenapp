const STORAGE_KEY = 'hidden_expedition_notify_pending';

function readPending(): Set<string> {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return new Set();
        const arr = JSON.parse(raw) as unknown;
        return new Set(Array.isArray(arr) ? arr.filter((x) => typeof x === 'string') : []);
    } catch {
        return new Set();
    }
}

function writePending(ids: Set<string>): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
    } catch {
        /* quota / private mode */
    }
}

export function markExpeditionNotifyPending(expeditionId: string): void {
    const set = readPending();
    set.add(expeditionId);
    writePending(set);
}

export function isExpeditionNotifyPending(expeditionId: string): boolean {
    return readPending().has(expeditionId);
}

export function clearExpeditionNotifyPending(expeditionId: string): void {
    const set = readPending();
    if (!set.delete(expeditionId)) return;
    writePending(set);
}
