/** Routes where the floating thumb bar is visible (exact match). */
export const BOTTOM_NAV_ROUTES = [
    '/home',
    '/search',
    '/environmental-monitor',
    '/budget',
    '/refugios',
] as const;

export type BottomNavTab = 'search' | 'monitor' | 'home' | 'budget' | 'refugios';

export const BOTTOM_NAV_TAB_ROUTES: Record<BottomNavTab, string> = {
    search: '/search',
    monitor: '/environmental-monitor',
    home: '/home',
    budget: '/budget',
    refugios: '/refugios',
};

/** CSS classes — spacing tokens live in index.css (:root --bottom-nav-*) */
export const BOTTOM_NAV_HOST_CLASS = 'bottom-nav-host';
export const BOTTOM_NAV_SCROLL_PADDING = 'bottom-nav-scroll-pad';
export const BOTTOM_NAV_SCROLL_SPACER = 'bottom-nav-scroll-spacer';
export const BOTTOM_NAV_SCROLL_WITH_FAB = 'bottom-nav-scroll-pad-fab';
export const BOTTOM_NAV_FAB_ANCHOR = 'bottom-nav-fab-anchor';

export function getBottomNavTab(pathname: string): BottomNavTab | null {
    switch (pathname) {
        case '/home':
            return 'home';
        case '/search':
            return 'search';
        case '/environmental-monitor':
            return 'monitor';
        case '/budget':
            return 'budget';
        case '/refugios':
            return 'refugios';
        default:
            return null;
    }
}

export function isBottomNavVisible(pathname: string): boolean {
    return getBottomNavTab(pathname) !== null;
}
