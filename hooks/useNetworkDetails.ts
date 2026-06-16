import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Network } from '@capacitor/network';

export type NetworkConnectionType = 'wifi' | 'cellular' | 'none' | 'unknown';

export interface NetworkDetails {
    isOnline: boolean;
    connectionType: NetworkConnectionType;
    /** Connected over Wi‑Fi or ethernet (or unknown while online on web). */
    isWifi: boolean;
    isCellular: boolean;
}

function mapWebConnectionType(): NetworkConnectionType {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        return 'none';
    }
    const conn =
        (navigator as Navigator & { connection?: { type?: string; effectiveType?: string } }).connection;
    const raw = `${conn?.type || ''} ${conn?.effectiveType || ''}`.toLowerCase();
    if (raw.includes('wifi') || raw.includes('ethernet')) return 'wifi';
    if (
        raw.includes('cellular') ||
        raw.includes('4g') ||
        raw.includes('3g') ||
        raw.includes('2g') ||
        raw.includes('slow-2g')
    ) {
        return 'cellular';
    }
    return 'unknown';
}

function toDetails(connected: boolean, connectionType: NetworkConnectionType): NetworkDetails {
    const type = connected ? connectionType : 'none';
    return {
        isOnline: connected,
        connectionType: type,
        isWifi: connected && (type === 'wifi' || type === 'unknown'),
        isCellular: connected && type === 'cellular',
    };
}

/**
 * Full connectivity signal: online/offline plus Wi‑Fi vs cellular when available.
 * Native uses `@capacitor/network`; web falls back to `navigator.onLine` + Network Information API.
 */
export function useNetworkDetails(): NetworkDetails {
    const [details, setDetails] = useState<NetworkDetails>(() => {
        const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
        return toDetails(online, mapWebConnectionType());
    });

    useEffect(() => {
        let active = true;
        let cleanup: (() => void) | undefined;

        const apply = (connected: boolean, connectionType: NetworkConnectionType) => {
            if (active) setDetails(toDetails(connected, connectionType));
        };

        const init = async () => {
            if (Capacitor.isNativePlatform()) {
                try {
                    const status = await Network.getStatus();
                    apply(status.connected, status.connectionType as NetworkConnectionType);

                    const handle = await Network.addListener('networkStatusChange', (status) => {
                        apply(status.connected, status.connectionType as NetworkConnectionType);
                    });
                    cleanup = () => {
                        handle.remove();
                    };
                    return;
                } catch (err) {
                    console.warn('[Network] Native details unavailable, falling back to web:', err);
                }
            }

            const update = () => apply(navigator.onLine, mapWebConnectionType());
            update();
            window.addEventListener('online', update);
            window.addEventListener('offline', update);
            const conn =
                (navigator as Navigator & { connection?: EventTarget }).connection ||
                (navigator as Navigator & { mozConnection?: EventTarget }).mozConnection ||
                (navigator as Navigator & { webkitConnection?: EventTarget }).webkitConnection;
            conn?.addEventListener?.('change', update);
            cleanup = () => {
                window.removeEventListener('online', update);
                window.removeEventListener('offline', update);
                conn?.removeEventListener?.('change', update);
            };
        };

        init();

        return () => {
            active = false;
            cleanup?.();
        };
    }, []);

    return details;
}
