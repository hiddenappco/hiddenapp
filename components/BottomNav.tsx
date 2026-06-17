import React from 'react';
import { useTranslation } from '../hooks/useTranslation';
import type { BottomNavTab } from '../utils/bottomNav';
import { BOTTOM_NAV_HOST_CLASS, BOTTOM_NAV_TAB_ROUTES } from '../utils/bottomNav';

interface BottomNavProps {
    activeTab: BottomNavTab;
    onNavigate: (path: string) => void;
}

type NavItem = {
    id: BottomNavTab;
    icon: string;
    labelKey: 'destinations' | 'monitor' | 'home' | 'budget' | 'refugios';
};

const NAV_ITEMS: NavItem[] = [
    { id: 'search', icon: 'travel_explore', labelKey: 'destinations' },
    { id: 'monitor', icon: 'radar', labelKey: 'monitor' },
    { id: 'home', icon: 'map', labelKey: 'home' },
    { id: 'budget', icon: 'account_balance_wallet', labelKey: 'budget' },
    { id: 'refugios', icon: 'home_work', labelKey: 'refugios' },
];

interface NavTabButtonProps {
    item: NavItem;
    isActive: boolean;
    label: string;
    onPress: () => void;
}

const NavTabButton: React.FC<NavTabButtonProps> = ({
    item,
    isActive,
    label,
    onPress,
}) => {
    return (
        <button
            type="button"
            onClick={onPress}
            aria-current={isActive ? 'page' : undefined}
            aria-label={label}
            className="touch-target group flex flex-1 flex-col items-center justify-center gap-0.5 min-w-0 min-h-[3.75rem] px-0.5 py-1 rounded-xl transition-colors duration-200 active:scale-[0.97]"
        >
            <span
                className={`flex size-9 shrink-0 items-center justify-center rounded-xl transition-colors duration-200 ${
                    isActive
                        ? 'text-primary'
                        : 'text-content/45 group-hover:text-content/70 group-hover:bg-overlay/5'
                }`}
            >
                <span
                    className="material-symbols-outlined text-[20px] leading-none"
                    style={isActive ? { fontVariationSettings: "'FILL' 1, 'wght' 500" } : { fontVariationSettings: "'wght' 400" }}
                >
                    {item.icon}
                </span>
            </span>
            <span
                className={`h-[11px] w-full text-[9px] font-semibold leading-[11px] tracking-wide truncate max-w-[4.25rem] text-center ${
                    isActive ? 'text-primary' : 'text-content/50'
                }`}
            >
                {label}
            </span>
            <span
                className={`h-0.5 w-3.5 shrink-0 rounded-full transition-colors duration-200 ${
                    isActive ? 'bg-primary/90' : 'bg-transparent'
                }`}
                aria-hidden="true"
            />
        </button>
    );
};

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onNavigate }) => {
    const { t } = useTranslation();

    const go = (tab: BottomNavTab) => {
        if (tab === activeTab) return;
        onNavigate(BOTTOM_NAV_TAB_ROUTES[tab]);
    };

    return (
        <div
            className={`fixed bottom-0 left-0 right-0 z-40 pointer-events-none flex justify-center px-3 ${BOTTOM_NAV_HOST_CLASS}`}
            role="navigation"
            aria-label={t('bottomNav.ariaLabel')}
        >
            <div className="pointer-events-auto bottom-nav-glass w-full max-w-md rounded-[1.35rem] px-1.5 py-1">
                <div className="relative z-[1] flex items-center justify-between gap-0.5">
                    {NAV_ITEMS.map((item) => (
                        <NavTabButton
                            key={item.id}
                            item={item}
                            isActive={activeTab === item.id}
                            label={t(`bottomNav.${item.labelKey}`)}
                            onPress={() => go(item.id)}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};
