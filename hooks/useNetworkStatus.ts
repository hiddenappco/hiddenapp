import { useNetworkDetails } from './useNetworkDetails';

/**
 * @returns `true` when the device has a connection, `false` when offline.
 * @see useNetworkDetails for Wi‑Fi vs cellular.
 */
export const useNetworkStatus = (): boolean => {
    return useNetworkDetails().isOnline;
};
