import { useEffect } from 'react';
import { deactivateEnvironmentalShield } from '../services/environmentalShield';

/**
 * Apaga el escudo al cerrar la app (pestaña/navegador).
 * En nativo, minimizar NO apaga el escudo: el TTL de 12h cubre ese caso para
 * no desactivar la vigilancia mientras el usuario solo cambia de app.
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

        return () => {
            window.removeEventListener('pagehide', onPageHide);
        };
    }, [userId]);
}
