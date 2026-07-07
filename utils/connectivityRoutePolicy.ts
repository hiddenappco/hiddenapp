/**
 * P1-OFF-03 — per-route connectivity behavior.
 * open: no guard (vault, bitácora, perfil, ajustes, viajes locales).
 * banner: sticky ConnectivityBanner; app remains navigable.
 * block: fullscreen explain + CTAs when cloud is required but unavailable.
 */

export type ConnectivityPolicy = 'open' | 'banner' | 'block';

export type NetworkBlockFeature = 'live' | 'chat' | 'expedition' | 'premium' | 'generic';

const BLOCK_PREFIXES = [
    '/live/',
    '/chat/',
    '/agent-select/',
    '/expedition/plan',
    '/premium',
] as const;

/** Routes that show a non-blocking connectivity banner when degraded. */
const BANNER_EXACT = new Set([
    '/home',
    '/search',
    '/budget',
    '/news',
    '/coupons',
    '/calendar',
    '/refugios',
    '/environmental-monitor',
    '/support',
    '/faq',
    '/notifications',
    '/settings/notifications',
]);

const BANNER_PREFIXES = [
    '/department/',
    '/destination/',
    '/saved',
    '/news/',
    '/coupons/',
    '/calendar/',
    '/refugio/',
    '/expedition/',
] as const;

export function getConnectivityPolicy(pathname: string): ConnectivityPolicy {
    const path = pathname.split('?')[0] || '/';

    for (const prefix of BLOCK_PREFIXES) {
        if (path === prefix || path.startsWith(prefix)) {
            return 'block';
        }
    }

    if (BANNER_EXACT.has(path)) {
        return 'banner';
    }

    for (const prefix of BANNER_PREFIXES) {
        if (path.startsWith(prefix)) {
            // Expedition planner is block; result pages stay banner.
            if (path.startsWith('/expedition/plan')) {
                return 'block';
            }
            return 'banner';
        }
    }

    return 'open';
}

export function getNetworkBlockFeature(pathname: string): NetworkBlockFeature {
    const path = pathname.split('?')[0] || '/';
    if (path.startsWith('/live/')) return 'live';
    if (path.startsWith('/chat/')) return 'chat';
    if (path.startsWith('/expedition/plan')) return 'expedition';
    if (path === '/premium' || path.startsWith('/premium/')) return 'premium';
    if (path.startsWith('/agent-select/')) return 'live';
    return 'generic';
}

/** Cloud routes need reachability when online; offline always blocks. */
export function shouldBlockCloudRoute(
    policy: ConnectivityPolicy,
    isOnline: boolean,
    serverReachable: boolean
): boolean {
    if (policy !== 'block') return false;
    if (!isOnline) return true;
    return !serverReachable;
}
