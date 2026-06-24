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

function readNetworkInformation():
    | { type?: string; effectiveType?: string }
    | undefined {
    if (typeof navigator === 'undefined') return undefined;
    const nav = navigator as Navigator & {
        connection?: { type?: string; effectiveType?: string };
        mozConnection?: { type?: string; effectiveType?: string };
        webkitConnection?: { type?: string; effectiveType?: string };
    };
    return nav.connection || nav.mozConnection || nav.webkitConnection;
}

/**
 * Web Network Information API.
 * IMPORTANT: `effectiveType` (2g/3g/4g) is a **throughput estimate**, not the radio
 * link — Chrome reports "4g" on desktop Wi‑Fi. Only `type` identifies cellular vs wifi.
 */
function mapWebConnectionType(): NetworkConnectionType {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        return 'none';
    }

    const conn = readNetworkInformation();
    const type = (conn?.type || '').toLowerCase();

    if (type === 'wifi' || type === 'ethernet') return 'wifi';
    if (type === 'cellular' || type === 'wimax') return 'cellular';
    if (type === 'none') return 'none';

    // bluetooth, other, unknown, or API hidden (common on desktop) → do not warn cellular
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
            const conn = readNetworkInformation() as EventTarget | undefined;
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
