import React from 'react';
import { useLayoutMenu } from '../../contexts/LayoutMenuContext';

/** Shared with Environmental Monitor — frosted bar that stays visible while scrolling. */
export const STICKY_GLASS_HEADER_CLASS =
    'sticky top-0 z-50 bg-nav-bg-dark/90 backdrop-blur-md border-b border-overlay/5 px-4 pt-safe pb-3 shrink-0';

export interface StickyGlassHeaderProps {
    onBack?: () => void;
    onMenuClick?: () => void;
    title?: string;
    subtitle?: string;
    titleLarge?: boolean;
    showLogo?: boolean;
    /** When false, hides the menu button even inside Layout routes (e.g. Pact gate). */
    showMenu?: boolean;
    right?: React.ReactNode;
    /** Replaces the default centered title block (e.g. agent avatar row). */
    center?: React.ReactNode;
    /** Search bars, filter chips, etc. — kept inside the sticky glass region. */
    children?: React.ReactNode;
    className?: string;
}

const navBtnClass =
    'touch-target flex size-10 items-center justify-center rounded-lg bg-overlay/5 border border-overlay/10 text-content-muted hover:bg-overlay/10 hover:text-content transition-colors active:scale-95';

export const StickyGlassHeader: React.FC<StickyGlassHeaderProps> = ({
    onBack,
    onMenuClick,
    title,
    subtitle,
    titleLarge = false,
    showLogo = true,
    showMenu = true,
    right,
    center,
    children,
    className = '',
}) => {
    const layoutMenu = useLayoutMenu();
    const openMenu = showMenu ? onMenuClick ?? layoutMenu : undefined;

    // A header shows EITHER back OR menu — never both. On subpages that provide a
    // back handler, back takes precedence; hubs without back fall back to the menu.
    const showBackButton = Boolean(onBack);
    const showMenuButton = !showBackButton && Boolean(openMenu);

    const titleClass = titleLarge
        ? 'text-lg font-bold text-content truncate leading-tight'
        : 'text-sm font-bold text-content truncate leading-tight';

    return (
        <header className={`${STICKY_GLASS_HEADER_CLASS} ${className}`}>
            <div className="flex items-center justify-between gap-2 min-h-10">
                <div className="flex items-center gap-1.5 shrink-0">
                    {showBackButton && (
                        <button
                            type="button"
                            onClick={onBack}
                            className={navBtnClass}
                            aria-label="Back"
                        >
                            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                        </button>
                    )}
                    {showMenuButton && openMenu && (
                        <button
                            type="button"
                            onClick={openMenu}
                            className={navBtnClass}
                            aria-label="Menu"
                        >
                            <span className="material-symbols-outlined text-[20px]">menu</span>
                        </button>
                    )}
                </div>

                {center ? (
                    <div className="min-w-0 flex-1 px-1">{center}</div>
                ) : title ? (
                    <div className="min-w-0 flex-1 text-center px-1">
                        <h1 className={titleClass}>{title}</h1>
                        {subtitle && (
                            <p className="text-[10px] text-content-muted truncate leading-tight mt-0.5">
                                {subtitle}
                            </p>
                        )}
                    </div>
                ) : (
                    <div className="flex-1" aria-hidden="true" />
                )}

                <div className="flex items-center gap-1 shrink-0">
                    {right}
                    {showLogo && (
                        <div className="size-10 flex items-center justify-center p-1">
                            <img
                                src="/assets/ui/logo.png"
                                alt="Hidden"
                                className="w-full h-full object-contain opacity-80"
                            />
                        </div>
                    )}
                </div>
            </div>
            {children ? <div className="mt-3 space-y-3">{children}</div> : null}
        </header>
    );
};

export const StickyHeaderActionButton: React.FC<{
    icon: string;
    onClick: () => void;
    disabled?: boolean;
    active?: boolean;
    activeClassName?: string;
    label?: string;
}> = ({ icon, onClick, disabled, active, activeClassName = 'text-red-500 filled-icon', label }) => (
    <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        className={`touch-target flex size-10 items-center justify-center rounded-lg bg-overlay/5 border border-overlay/10 hover:bg-overlay/10 hover:text-content transition-colors active:scale-95 disabled:opacity-50 ${active ? 'text-content' : 'text-content-muted'}`}
    >
        <span className={`material-symbols-outlined text-[20px] ${active ? activeClassName : ''}`}>{icon}</span>
    </button>
);
