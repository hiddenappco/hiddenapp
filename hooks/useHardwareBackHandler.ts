import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { pushBackHandler } from '../services/hardwareBackStack';

/**
 * Registers a handler for the Android hardware back button (native only).
 * Return true from the handler to prevent default navigation.
 */
export function useHardwareBackHandler(handler: () => boolean, deps: unknown[]) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    return pushBackHandler(() => handlerRef.current());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
