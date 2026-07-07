import React, { useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useNetworkDetails } from '../../hooks/useNetworkDetails';
import {
    ConnectivityBanner,
    resolveConnectivityBannerVariant,
} from '../ui/ConnectivityBanner';
import { NetworkRequiredBlock } from './NetworkRequiredBlock';
import {
    type ConnectivityPolicy,
    getConnectivityPolicy,
    getNetworkBlockFeature,
    shouldBlockCloudRoute,
} from '../../utils/connectivityRoutePolicy';

interface ConnectivityGuardProps {
    policy: ConnectivityPolicy;
    isOnline: boolean;
    serverReachable: boolean;
    onGoToVault: () => void;
    onGoToOfflineHub: () => void;
    children: React.ReactNode;
}

/**
 * Wraps a route with P1-OFF-03 connectivity behavior.
 * - open: render children only
 * - banner: sticky strip + children (app stays navigable)
 * - block: fullscreen only when cloud is required but unavailable
 */
export const ConnectivityGuard: React.FC<ConnectivityGuardProps> = ({
    policy,
    isOnline,
    serverReachable,
    onGoToVault,
    onGoToOfflineHub,
    children,
}) => {
    const { pathname } = useLocation();
    const network = useNetworkDetails();

    // `AnimatePresence mode="sync"` keeps the outgoing page's guard mounted during
    // its exit animation. `useLocation()` is a router-wide context, so that stale
    // guard instance re-renders with the *new* pathname even though its `policy`
    // prop is still the one for the route it was created for. Freeze the pathname
    // this instance first saw so the dev check (and the block-screen feature
    // label below) always compares against its own route, never a route it's
    // transiently sharing a render pass with.
    const ownPathnameRef = useRef(pathname);

    // Dev safety net: keep the per-route policy in AppRoutes aligned with the
    // documented map. Warns (never throws) if a route is wrapped with a policy
    // that contradicts connectivityRoutePolicy — catches drift during edits.
    if (import.meta.env.DEV) {
        const expected = getConnectivityPolicy(ownPathnameRef.current);
        if (expected !== policy) {
            // eslint-disable-next-line no-console
            console.warn(
                `[ConnectivityGuard] Policy mismatch for "${ownPathnameRef.current}": wrapped as "${policy}" but expected "${expected}". Update AppRoutes or connectivityRoutePolicy.`
            );
        }
    }

    if (policy === 'open') {
        return <>{children}</>;
    }

    if (
        policy === 'block' &&
        shouldBlockCloudRoute(policy, isOnline, serverReachable)
    ) {
        const variant = !isOnline ? 'offline' : 'server';
        return (
            <NetworkRequiredBlock
                variant={variant}
                feature={getNetworkBlockFeature(ownPathnameRef.current)}
                onGoToVault={onGoToVault}
            />
        );
    }

    // Block routes that are currently reachable render their feature untouched.
    if (policy !== 'banner') {
        return <>{children}</>;
    }

    const resolved = resolveConnectivityBannerVariant(
        network,
        isOnline,
        serverReachable
    );
    // The cellular ("mobile data") advisory only matters where large downloads
    // happen (the Off-Grid Vault shows it there). App-wide it would be a
    // permanent nag on every screen, so route banners surface only real
    // degradation: no signal or servers unreachable.
    const bannerVariant = resolved === 'cellular' ? null : resolved;

    // Stable wrapper: the child tree stays mounted whether or not the banner is
    // visible, so connectivity flips never remount the page (no lost scroll,
    // form state, or in-flight data). The banner just appears/disappears above.
    return (
        <div className="h-full min-h-0 flex flex-col">
            {bannerVariant && (
                <div className="shrink-0 px-4 pt-[max(0.5rem,var(--safe-top))] pb-1 z-30">
                    <ConnectivityBanner
                        variant={bannerVariant}
                        onOpenOfflineHub={
                            bannerVariant === 'offline' || bannerVariant === 'server'
                                ? onGoToOfflineHub
                                : undefined
                        }
                    />
                </div>
            )}
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">{children}</div>
        </div>
    );
};
