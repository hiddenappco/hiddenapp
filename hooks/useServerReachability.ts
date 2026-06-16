import { useState, useEffect } from 'react';

/** Same-origin static asset (public/manifest.webmanifest) — always deployed with the PWA. */
const PING_URL = '/manifest.webmanifest';
const PING_INTERVAL_MS = 60_000;
const PING_TIMEOUT_MS = 8_000;

/**
 * Lightweight reachability check when the device reports online.
 * Distinguishes «no signal» from «Hidden hosting temporarily unreachable».
 *
 * Skipped in Vite dev: localhost has no favicon/manifest routing semantics for cloud health.
 */
export function useServerReachability(isOnline: boolean): boolean {
    const [reachable, setReachable] = useState(true);

    useEffect(() => {
        if (!isOnline) {
            setReachable(false);
            return;
        }

        if (import.meta.env.DEV) {
            setReachable(true);
            return;
        }

        let cancelled = false;

        const ping = async () => {
            try {
                const res = await fetch(PING_URL, {
                    method: 'GET',
                    cache: 'no-store',
                    signal: AbortSignal.timeout(PING_TIMEOUT_MS),
                });
                if (!cancelled) setReachable(res.ok);
            } catch {
                if (!cancelled) setReachable(false);
            }
        };

        setReachable(true);
        ping();
        const id = window.setInterval(ping, PING_INTERVAL_MS);
        return () => {
            cancelled = true;
            window.clearInterval(id);
        };
    }, [isOnline]);

    return reachable;
}
