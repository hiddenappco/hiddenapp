import { useState, useEffect, useRef } from 'react';

/** Same-origin static asset (public/manifest.webmanifest) — always deployed with the PWA. */
const PING_URL = '/manifest.webmanifest';
const PING_INTERVAL_MS = 60_000;
const PING_TIMEOUT_MS = 8_000;
/**
 * Consecutive failed pings before declaring the server down. A single transient
 * timeout must NOT tear down an active Live call / cloud chat or flash a block
 * screen, so we require two misses in a row. Any success resets immediately.
 */
const FAILURE_THRESHOLD = 2;

/**
 * Lightweight reachability check when the device reports online.
 * Distinguishes «no signal» from «Hidden hosting temporarily unreachable».
 *
 * Skipped in Vite dev: localhost has no favicon/manifest routing semantics for cloud health.
 */
export function useServerReachability(isOnline: boolean): boolean {
    const [reachable, setReachable] = useState(true);
    const failuresRef = useRef(0);

    useEffect(() => {
        if (!isOnline) {
            failuresRef.current = 0;
            setReachable(false);
            return;
        }

        if (import.meta.env.DEV) {
            setReachable(true);
            return;
        }

        let cancelled = false;

        const markSuccess = () => {
            if (cancelled) return;
            failuresRef.current = 0;
            setReachable(true);
        };

        const markFailure = () => {
            if (cancelled) return;
            failuresRef.current += 1;
            if (failuresRef.current >= FAILURE_THRESHOLD) {
                setReachable(false);
            }
        };

        const ping = async () => {
            try {
                const res = await fetch(PING_URL, {
                    method: 'GET',
                    cache: 'no-store',
                    signal: AbortSignal.timeout(PING_TIMEOUT_MS),
                });
                if (res.ok) markSuccess();
                else markFailure();
            } catch {
                markFailure();
            }
        };

        failuresRef.current = 0;
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
