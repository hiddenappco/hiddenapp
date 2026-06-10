import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { deactivateEnvironmentalShield } from '../services/environmentalShield';

/**
 * Apaga el escudo al cerrar la app (pestaña/navegador o salida nativa).
 * En Android/iOS minimizar también dispara inactividad; el TTL de 12h cubre ese caso.
 */
export function useEnvironmentalShieldLifecycle(userId: string | undefined) {
    useEffect(() => {
        if (!userId) return;

        const deactivate = () => {
            deactivateEnvironmentalShield(userId).catch((err) =>
                console.warn('[Hidden Guard] Shield deactivate on close failed:', err)
            );
        };

        const onPageHide = () => deactivate();
        window.addEventListener('pagehide', onPageHide);

        let removeAppListener: (() => void) | undefined;
        if (Capacitor.isNativePlatform()) {
            CapacitorApp.addListener('appStateChange', ({ isActive }) => {
                if (!isActive) deactivate();
            }).then((handle) => {
                removeAppListener = () => handle.remove();
            });
        }

        return () => {
            window.removeEventListener('pagehide', onPageHide);
            removeAppListener?.();
        };
    }, [userId]);
}
