import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Network } from '@capacitor/network';

/**
 * Reliable connectivity signal across platforms.
 *
 * On native (Android/iOS) the browser's `navigator.onLine` is unreliable inside
 * the Capacitor WebView — it often stays `true` after the device loses its data
 * connection, so the Off-Grid guardian never triggers. We use the native
 * `@capacitor/network` plugin there and fall back to `navigator.onLine` +
 * window events on the web.
 *
 * @returns `true` when the device has a connection, `false` when offline.
 */
export const useNetworkStatus = (): boolean => {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
      return navigator.onLine;
    }
    return true;
  });

  useEffect(() => {
    let active = true;
    let cleanup: (() => void) | undefined;

    const init = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          const status = await Network.getStatus();
          if (active) setIsOnline(status.connected);

          const handle = await Network.addListener('networkStatusChange', (status) => {
            setIsOnline(status.connected);
          });
          cleanup = () => {
            handle.remove();
          };
          return;
        } catch (err) {
          console.warn('[Network] Native status unavailable, falling back to navigator:', err);
          if (active) setIsOnline(navigator.onLine);
        }
      }

      const update = () => setIsOnline(navigator.onLine);
      update();
      window.addEventListener('online', update);
      window.addEventListener('offline', update);
      cleanup = () => {
        window.removeEventListener('online', update);
        window.removeEventListener('offline', update);
      };
    };

    init();

    return () => {
      active = false;
      cleanup?.();
    };
  }, []);

  return isOnline;
};
